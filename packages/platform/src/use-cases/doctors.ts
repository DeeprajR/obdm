/**
 * Doctor records, managed by an administrator (§2.3, §8.1).
 *
 * The administration application owns exactly this: a doctor's name,
 * registration number, seal and address. It creates the account and it never
 * knows a password, because at the moment it creates one none exists. The
 * person sets theirs from a link sent to their inbox.
 *
 * Every use case here opens one transaction, asserts its own permission, and
 * queues any email in the same transaction as the change that caused it.
 */

import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { err, ok, type Result } from '@obdm/result';
import { objectRefs, userSeals, users, type UserStatus } from '@obdm/db';

import { appOrigin } from '../app-origins.js';
import type { UseCaseContext } from '../context.js';
import { actorHas, audienceFor } from '../domain/authorization.js';
import { isPlausibleEmail, normaliseEmail } from '../domain/credentials.js';
import {
  accountNotFound,
  emailTaken,
  lastAdministrator,
  linkNotUsable,
  notAuthorized,
  type AccountNotFound,
  type EmailTaken,
  type LastAdministrator,
  type LinkNotUsable,
  type NotAuthorized,
} from '../errors.js';
import { findAccountById, revokeAllSessionsForUser } from '../repositories/accounts.js';
import { createAuditWriter } from '../repositories/audit.js';
import { queueEmail } from '../repositories/email-outbox.js';
import {
  createInvite,
  supersedeLiveEmailChanges,
  supersedeLiveInvites,
  supersedeLiveOtps,
} from '../repositories/lifecycle.js';

/**
 * The roles an administrator provisions and manages from the administration
 * application (§2.2). Administrators are not among them: an administrator's
 * own details are not edited from here, by them or by another.
 */
export const MANAGED_ROLES = ['doctor', 'blood_centre', 'volunteer_admin'] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];

const isManagedRole = (role: string): role is ManagedRole =>
  (MANAGED_ROLES as readonly string[]).includes(role);

/**
 * The account an administrator is about to change, if it is one they may.
 *
 * Every id these use cases take came from a form, and a form can be posted
 * with any id. Without this, `doctors:manage` let an administrator rename
 * themselves around the update queue, or move another administrator's email
 * to an inbox they read and reset their way in.
 */
async function findManagedAccount(
  ctx: UseCaseContext,
  tx: Parameters<typeof findAccountById>[0],
  userId: string,
) {
  if (ctx.actor.kind === 'user' && ctx.actor.userId === userId) return undefined;
  const account = await findAccountById(tx, userId);
  return account && isManagedRole(account.role) ? account : undefined;
}

/** An empty registration number means "not recorded", not an empty string. */
const blankToNull = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export type DoctorSummary = {
  readonly id: string;
  readonly role: ManagedRole;
  readonly fullName: string;
  readonly email: string;
  readonly provisionalReg: string | null;
  readonly status: UserStatus;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly hasSeal: boolean;
};

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */

export type CreateDoctorInput = {
  readonly fullName: string;
  readonly email: string;
  readonly provisionalReg: string | null;
  /** Which application they will use. A doctor unless said otherwise. */
  readonly role?: ManagedRole;
};

export type CreateDoctorError = NotAuthorized | EmailTaken;

/**
 * Creates the account and queues its invite in one transaction.
 *
 * The two must commit together. An account created whose invite was never
 * queued is an account nobody can sign in to and nobody was told about, and it
 * looks exactly like an invite the doctor ignored, which is the failure §8
 * asks every flow to make impossible.
 */
export async function createDoctor(
  ctx: UseCaseContext,
  input: CreateDoctorInput,
): Promise<Result<{ userId: string }, CreateDoctorError>> {
  if (!actorHas(ctx.actor, 'doctors:manage')) return err(notAuthorized('doctors:manage'));

  const now = ctx.clock.now();
  const email = normaliseEmail(input.email);
  if (!isPlausibleEmail(email)) return err(emailTaken());
  const role: ManagedRole = input.role ?? 'doctor';
  if (!isManagedRole(role)) return err(notAuthorized('doctors:manage'));

  return ctx.db.transaction(async (tx) => {
    const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing.length > 0) return err(emailTaken());

    const userId = ctx.ids.next<'UserId'>();

    await tx.insert(users).values({
      id: userId,
      email,
      fullName: input.fullName.trim(),
      role,
      // A registration number is a doctor's; nobody else's is recorded.
      provisionalReg: role === 'doctor' ? blankToNull(input.provisionalReg) : null,
      // No password field exists here, and the administrator never knows one.
      status: 'pending_activation',
      passwordHash: null,
    });

    await issueInvite(ctx, tx, {
      userId,
      email,
      fullName: input.fullName.trim(),
      role,
      now,
      kind: 'invite',
    });

    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);
    await audit({
      action: 'account.created',
      subjectType: 'user',
      subjectId: userId,
      metadata: { role, email },
    });

    return ok({ userId });
  });
}

/** Shared by creation and re-send: supersede, insert, queue. */
async function issueInvite(
  ctx: UseCaseContext,
  tx: Parameters<typeof supersedeLiveInvites>[0],
  args: {
    userId: string;
    email: string;
    fullName: string;
    role: ManagedRole;
    now: Date;
    kind: 'invite' | 'invite_resent';
  },
): Promise<void> {
  const ttlHours = ctx.config.auth.inviteTtlHours;
  const token = ctx.ports.tokens.issue();

  // Supersede first: the partial unique index permits one live invite per
  // account, so a re-send must kill the previous one before inserting.
  await supersedeLiveInvites(tx, args.userId, args.now);

  await createInvite(tx, {
    id: ctx.ids.next<'InviteId'>(),
    userId: args.userId,
    tokenHash: ctx.ports.tokens.fingerprint(token),
    expiresAt: new Date(args.now.getTime() + ttlHours * 3_600_000),
    sentBy: ctx.actor.kind === 'user' ? ctx.actor.userId : null,
  });

  await queueEmail(tx, {
    kind: args.kind,
    to: args.email,
    userId: args.userId,
    vars: {
      fullName: args.fullName,
      // They set their password in their own application, which is a
      // different origin from the administration app that sent the invite.
      link: `${appOrigin(audienceFor(args.role))}/invite/${token}`,
      expiresInHours: String(ttlHours),
    },
  });
}

export async function resendInvite(
  ctx: UseCaseContext,
  userId: string,
): Promise<Result<Record<string, never>, NotAuthorized | AccountNotFound | LinkNotUsable>> {
  if (!actorHas(ctx.actor, 'doctors:manage')) return err(notAuthorized('doctors:manage'));

  const now = ctx.clock.now();

  return ctx.db.transaction(async (tx) => {
    const account = await findManagedAccount(ctx, tx, userId);
    if (!account) return err(accountNotFound());

    // Re-sending to an account that is already using the system would issue a
    // password-setting link to someone who has a password. An account
    // takeover primitive handed to whoever can read that inbox.
    if (account.status !== 'pending_activation') return err(linkNotUsable());

    await issueInvite(ctx, tx, {
      userId,
      email: account.email,
      fullName: account.fullName,
      role: account.role as ManagedRole,
      now,
      kind: 'invite_resent',
    });

    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);
    await audit({ action: 'account.invite_resent', subjectType: 'user', subjectId: userId });

    return ok({});
  });
}

/* -------------------------------------------------------------------------- */
/* Update                                                                      */
/* -------------------------------------------------------------------------- */

export type UpdateDoctorInput = {
  readonly fullName: string;
  readonly provisionalReg: string | null;
};

export async function updateDoctor(
  ctx: UseCaseContext,
  userId: string,
  input: UpdateDoctorInput,
): Promise<Result<Record<string, never>, NotAuthorized | AccountNotFound>> {
  if (!actorHas(ctx.actor, 'doctors:manage')) return err(notAuthorized('doctors:manage'));

  const now = ctx.clock.now();

  return ctx.db.transaction(async (tx) => {
    const before = await findManagedAccount(ctx, tx, userId);
    if (!before) return err(accountNotFound());

    const fullName = input.fullName.trim();
    const provisionalReg = before.role === 'doctor' ? blankToNull(input.provisionalReg) : null;

    await tx.update(users).set({ fullName, provisionalReg }).where(eq(users.id, userId));

    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);
    // Old and new both recorded: "what did it used to say" is the question an
    // audit log is read to answer (§14).
    await audit({
      action: 'account.details_changed',
      subjectType: 'user',
      subjectId: userId,
      metadata: {
        fullName: { from: before.fullName, to: fullName },
        provisionalReg: { from: before.provisionalReg, to: provisionalReg },
      },
    });

    return ok({});
  });
}

/**
 * An administrator setting a doctor's address directly.
 *
 * Both addresses are told, because this is the one change that can quietly move
 * an account to someone else's inbox, and the person losing it must hear about
 * it at the address they still read.
 */
export async function setDoctorEmail(
  ctx: UseCaseContext,
  userId: string,
  newEmailInput: string,
): Promise<Result<Record<string, never>, NotAuthorized | AccountNotFound | EmailTaken>> {
  if (!actorHas(ctx.actor, 'doctors:manage')) return err(notAuthorized('doctors:manage'));

  const now = ctx.clock.now();
  const newEmail = normaliseEmail(newEmailInput);
  if (!isPlausibleEmail(newEmail)) return err(emailTaken());

  return ctx.db.transaction(async (tx) => {
    const before = await findManagedAccount(ctx, tx, userId);
    if (!before) return err(accountNotFound());
    if (before.email.toLowerCase() === newEmail) return ok({});

    const clash = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, newEmail), ne(users.id, userId)));
    if (clash.length > 0) return err(emailTaken());

    await tx.update(users).set({ email: newEmail }).where(eq(users.id, userId));

    /*
      Every credential that went to the old address dies with it: an invite
      not yet opened, a reset code, a confirmation for a change somebody else
      started. Left live, any of them would let whoever holds the old inbox,
      or a session that started that change, undo the correction or walk in.
    */
    await supersedeLiveInvites(tx, userId, now);
    await supersedeLiveOtps(tx, userId, now);
    await supersedeLiveEmailChanges(tx, userId, now);
    if (before.status === 'pending_activation') {
      await issueInvite(ctx, tx, {
        userId,
        email: newEmail,
        fullName: before.fullName,
        role: before.role as ManagedRole,
        now,
        kind: 'invite_resent',
      });
    }

    await queueEmail(tx, {
      kind: 'email_change_notice',
      to: before.email,
      userId,
      vars: { fullName: before.fullName, newEmail },
    });

    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);
    await audit({
      action: 'account.email_changed',
      subjectType: 'user',
      subjectId: userId,
      metadata: { from: before.email, to: newEmail, by: 'administrator' },
    });

    return ok({});
  });
}

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

export async function setAccountStatus(
  ctx: UseCaseContext,
  userId: string,
  status: Extract<UserStatus, 'active' | 'deactivated'>,
): Promise<
  Result<Record<string, never>, NotAuthorized | AccountNotFound | LastAdministrator>
> {
  if (!actorHas(ctx.actor, 'doctors:manage')) return err(notAuthorized('doctors:manage'));

  // Nobody deactivates their own account (§13). Not a courtesy. It is what
  // stops an administrator locking themselves out of the only way back in.
  if (ctx.actor.kind === 'user' && ctx.actor.userId === userId) {
    return err(notAuthorized('doctors:manage'));
  }

  const now = ctx.clock.now();

  return ctx.db.transaction(async (tx) => {
    // Staff, or another administrator (§2.2: admins provision and deactivate
    // accounts), which between them is every role; never themselves, which is
    // refused above.
    const account = await findAccountById(tx, userId);
    if (!account) return err(accountNotFound());
    if (account.status === status) return ok({});

    if (status === 'deactivated' && account.role === 'admin') {
      // Every active administrator's row is locked, this one's included, in a
      // fixed order, so two concurrent demotions queue on the same rows and the
      // second one counts after the first has landed (§13). Postgres refuses
      // FOR UPDATE on an aggregate, so the count is taken from the locked rows.
      const active = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.status, 'active')))
        .orderBy(users.id)
        .for('update');

      if (active.every((row) => row.id === userId)) return err(lastAdministrator());
    }

    // An account that never activated has no password, and the CHECK
    // constraint ties that to `pending_activation`, so reactivating one puts
    // it back where it was rather than into an impossible state.
    const nextStatus =
      status === 'active' && account.passwordHash === null ? 'pending_activation' : status;

    await tx.update(users).set({ status: nextStatus }).where(eq(users.id, userId));

    if (nextStatus === 'deactivated') {
      // Deactivating ends the sessions, which is what the word means to whoever
      // clicked it, and withdraws any invite still waiting to be opened.
      await revokeAllSessionsForUser(tx, userId, now);
      await supersedeLiveInvites(tx, userId, now);

      // Someone who never activated never had access to lose; telling them it
      // has ended would be the first they heard of it.
      if (account.passwordHash !== null) {
        await queueEmail(tx, {
          kind: 'account_deactivated',
          to: account.email,
          userId,
          vars: { fullName: account.fullName },
        });
      }
    }

    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);
    await audit({
      action: 'account.status_changed',
      subjectType: 'user',
      subjectId: userId,
      metadata: { from: account.status, to: nextStatus },
    });

    return ok({});
  });
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export async function listDoctors(ctx: UseCaseContext): Promise<DoctorSummary[]> {
  const rows = await ctx.db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      provisionalReg: users.provisionalReg,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      role: users.role,
      sealId: userSeals.objectRefId,
    })
    .from(users)
    .leftJoin(userSeals, eq(userSeals.userId, users.id))
    .where(inArray(users.role, [...MANAGED_ROLES]))
    .orderBy(desc(users.createdAt));

  return rows.map((row) => ({
    id: row.id,
    role: row.role as ManagedRole,
    fullName: row.fullName,
    email: row.email,
    provisionalReg: row.provisionalReg,
    status: row.status as UserStatus,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    hasSeal: row.sealId !== null,
  }));
}

export type DoctorDetail = DoctorSummary & {
  readonly sealObjectId: string | null;
  readonly sealContentType: string | null;
};

export async function getDoctor(
  ctx: UseCaseContext,
  userId: string,
): Promise<DoctorDetail | undefined> {
  const [row] = await ctx.db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      provisionalReg: users.provisionalReg,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      role: users.role,
      sealObjectId: objectRefs.id,
      sealContentType: objectRefs.contentType,
    })
    .from(users)
    .leftJoin(userSeals, eq(userSeals.userId, users.id))
    .leftJoin(objectRefs, eq(objectRefs.id, userSeals.objectRefId))
    .where(and(eq(users.id, userId), inArray(users.role, [...MANAGED_ROLES])));

  if (!row) return undefined;

  return {
    id: row.id,
    role: row.role as ManagedRole,
    fullName: row.fullName,
    email: row.email,
    provisionalReg: row.provisionalReg,
    status: row.status as UserStatus,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    hasSeal: row.sealObjectId !== null,
    sealObjectId: row.sealObjectId,
    sealContentType: row.sealContentType,
  };
}
