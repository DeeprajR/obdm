/**
 * Sign in (§3, §8.1, §13).
 *
 * One transaction. Throttle, verify, issue the session, roll the counters and
 * write the audit row together, so a session that exists is always a session
 * that was audited, and a failure never leaves a half-recorded attempt.
 *
 * Three rules the spec states and this file implements literally:
 *
 *  - **Identical response for wrong user and wrong password** (§15). Also for a
 *    deactivated account and one that has never been activated. Anything else
 *    turns the sign-in form into an account-enumeration oracle.
 *  - **Throttled per IP and per account, in the database** (§3), so the limit
 *    survives a restart and applies across replicas.
 *  - **The session token is stored only as a hash** (§13). What goes in the
 *    cookie never touches a column.
 */

import { err, ok, type Result } from '@obdm/result';
import type { UserRole } from '@obdm/db';

import type { UseCaseContext } from '../context.js';
import {
  accountNotFound,
  invalidCredentials,
  rateLimited,
  type AccountNotFound,
  type InvalidCredentials,
  type RateLimited,
} from '../errors.js';
import {
  createSession,
  findAccountByEmail,
  touchLastLogin,
  setPasswordHash,
  type Audience,
} from '../repositories/accounts.js';
import { ROLES_BY_AUDIENCE } from '../domain/authorization.js';
import {
  attemptsInWindow,
  clearAttempts,
  recordFailedAttempt,
  secondsUntilWindowEnds,
} from '../repositories/rate-limits.js';
import { createAuditWriter } from '../repositories/audit.js';

export type SignInInput = {
  readonly email: string;
  readonly password: string;
  /**
   * Which application is signing them in. The session is bound to it, and each
   * application admits exactly one role: a doctor signs in to the doctor app
   * and nowhere else, and so on for the other three (§1, §9, ADR 0016).
   */
  readonly audience: Audience;
};

export type SignInSuccess = {
  /** Goes in the cookie. The caller sets it and then forgets it. */
  readonly token: string;
  readonly expiresAt: Date;
  readonly user: {
    readonly id: string;
    readonly fullName: string;
    readonly role: UserRole;
  };
};

export type SignInError = InvalidCredentials | RateLimited;

/** How long a session lasts. Long enough for a shift, short enough to matter. */
export const SESSION_TTL_HOURS = 12;

/**
 * A real Argon2id hash of a value nobody knows, verified against when no
 * account matches.
 *
 * Without it, "no such account" returns in a millisecond and "wrong password"
 * takes the ~100ms Argon2id deliberately costs, and that difference is the
 * enumeration oracle the identical *message* was there to prevent. Generated at
 * module load so the parameters always match the live hasher's.
 */
let decoyHash: string | undefined;

async function equaliseTiming(
  ctx: UseCaseContext,
  password: string,
): Promise<void> {
  decoyHash ??= await ctx.ports.hasher.hash('a password that is not anyones');
  await ctx.ports.hasher.verify(decoyHash, password);
}

/**
 * How many times the per-(account, address) limit the account as a whole may
 * take before it too is refused.
 *
 * The hard limit is keyed on the account **and** the address together. Keyed
 * on the account alone, anybody who knew a doctor's email could send five
 * wrong passwords every fifteen minutes and keep that doctor out of a system
 * they need in an emergency, correct password or not. The account-wide count
 * stays, much higher, as the bound on guessing spread across many addresses.
 */
export const ACCOUNT_WIDE_FACTOR = 10;

/** The key for one account from one address, under the account scope. */
export const pairKeyOf = (accountKey: string, ipKey: string): string => `${accountKey}#${ipKey}`;

export async function signIn(
  ctx: UseCaseContext,
  input: SignInInput,
): Promise<Result<SignInSuccess, SignInError>> {
  const now = ctx.clock.now();
  const throttle = ctx.config.auth.loginThrottle;
  const accountKey = input.email.trim().toLowerCase();
  const ipKey = ctx.request?.ip ?? 'unknown';
  const pairKey = pairKeyOf(accountKey, ipKey);

  return ctx.db.transaction(async (tx) => {
    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);

    /* 1. Throttle, before any work that could be measured. ------------------ */
    const [ipAttempts, accountAttempts, pairAttempts] = await Promise.all([
      attemptsInWindow(tx, 'login_ip', ipKey, now, throttle.windowMinutes),
      attemptsInWindow(tx, 'login_account', accountKey, now, throttle.windowMinutes),
      attemptsInWindow(tx, 'login_account', pairKey, now, throttle.windowMinutes),
    ]);

    const overIpLimit = ipAttempts >= throttle.maxAttemptsPerIp;
    const overAccountLimit =
      pairAttempts >= throttle.maxAttemptsPerAccount ||
      accountAttempts >= throttle.maxAttemptsPerAccount * ACCOUNT_WIDE_FACTOR;

    if (overIpLimit || overAccountLimit) {
      await audit({
        action: 'session.throttled',
        subjectType: 'email',
        subjectId: accountKey,
        metadata: { ipAttempts, accountAttempts, pairAttempts },
      });
      return err(rateLimited(secondsUntilWindowEnds(now, throttle.windowMinutes)));
    }

    /* 2. Find the account. ------------------------------------------------- */
    const account = await findAccountByEmail(tx, accountKey);

    // Not found, never activated, or deactivated, all one outcome, and all
    // reached through the same amount of work.
    // Wrong application for this role: a centre account at the doctor sign-in,
    // or a doctor at the admin one. Refused exactly like a wrong password, so
    // no form reveals which accounts exist in the other applications.
    const wrongAudience =
      account !== undefined && !ROLES_BY_AUDIENCE[input.audience].includes(account.role);

    if (!account?.passwordHash || account.status !== 'active' || wrongAudience) {
      await equaliseTiming(ctx, input.password);
      await recordFailure(tx, now, throttle.windowMinutes, ipKey, accountKey);
      await audit({
        action: 'session.rejected',
        subjectType: 'email',
        subjectId: accountKey,
        // The reason is recorded for whoever reads the log later. It is never
        // returned to the caller.
        metadata: {
          reason: !account
            ? 'no_account'
            : wrongAudience
              ? `wrong_audience_${account.role}`
              : `status_${account.status}`,
        },
      });
      return err(invalidCredentials());
    }

    /* 3. Verify. ----------------------------------------------------------- */
    const verified = await ctx.ports.hasher.verify(account.passwordHash, input.password);
    if (!verified) {
      await recordFailure(tx, now, throttle.windowMinutes, ipKey, accountKey);
      await audit({
        action: 'session.rejected',
        subjectType: 'user',
        subjectId: account.id,
        metadata: { reason: 'wrong_password' },
      });
      return err(invalidCredentials());
    }

    /* 4. Issue the session. ------------------------------------------------ */
    const token = ctx.ports.tokens.issue();
    const sessionId = ctx.ids.next<'SessionId'>();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 3_600_000);

    await createSession(tx, {
      id: sessionId,
      userId: account.id,
      tokenHash: ctx.ports.tokens.fingerprint(token),
      audience: input.audience,
      expiresAt,
      ip: ctx.request?.ip ?? null,
      userAgent: ctx.request?.userAgent ?? null,
    });

    await touchLastLogin(tx, account.id, now);

    // A successful sign-in is the only moment the plaintext exists, so it is
    // the only moment a hash made with weaker parameters can be upgraded.
    if (ctx.ports.hasher.needsRehash(account.passwordHash)) {
      await setPasswordHash(tx, account.id, await ctx.ports.hasher.hash(input.password));
    }

    // The account's counter is cleared; the IP's is not. On a shared hospital
    // network one person signing in successfully must not reset an attacker's
    // budget from the same address.
    await clearAttempts(tx, 'login_account', accountKey);
    await clearAttempts(tx, 'login_account', pairKey);

    await audit({
      action: 'session.created',
      subjectType: 'user',
      subjectId: account.id,
      metadata: { sessionId, role: account.role, audience: input.audience },
    });

    return ok({
      token,
      expiresAt,
      user: { id: account.id, fullName: account.fullName, role: account.role },
    });
  });
}

async function recordFailure(
  tx: Parameters<typeof recordFailedAttempt>[0],
  now: Date,
  windowMinutes: number,
  ipKey: string,
  accountKey: string,
): Promise<void> {
  await recordFailedAttempt(tx, 'login_ip', ipKey, now, windowMinutes);
  await recordFailedAttempt(tx, 'login_account', accountKey, now, windowMinutes);
  await recordFailedAttempt(tx, 'login_account', pairKeyOf(accountKey, ipKey), now, windowMinutes);
}

/**
 * How many demonstration sessions one address may open in a sign-in window.
 * Generous, because a whole department behind one hospital NAT may open the
 * demonstration in the same quarter-hour; bounded, so a script cannot fill
 * the sessions table.
 */
export const DEMO_SESSIONS_PER_IP = 60;

/**
 * A session on the shared demonstration account, with no password (§3 does
 * not apply: this is the prototype being shown, not the system in use).
 *
 * The deployment names the account (`DEMO_ACCOUNT` on that application); a
 * visitor names nothing, so the button cannot be pointed at anyone else. The
 * account must be active and of this application's role, and never an
 * administrator, whatever the configuration says.
 *
 * Throttled per address under the sign-in scope, on a key of its own, so the
 * demonstration neither spends nor is limited by the password form's budget.
 */
export async function startDemoSession(
  ctx: UseCaseContext,
  demoEmail: string,
  audience: Audience,
): Promise<Result<SignInSuccess, AccountNotFound | RateLimited>> {
  const now = ctx.clock.now();
  const throttle = ctx.config.auth.loginThrottle;
  const ipKey = `demo#${ctx.request?.ip ?? 'unknown'}`;

  return ctx.db.transaction(async (tx) => {
    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);

    const opened = await attemptsInWindow(tx, 'login_ip', ipKey, now, throttle.windowMinutes);
    if (opened >= DEMO_SESSIONS_PER_IP) {
      return err(rateLimited(secondsUntilWindowEnds(now, throttle.windowMinutes)));
    }

    const account = await findAccountByEmail(tx, demoEmail.trim().toLowerCase());
    if (
      account?.status !== 'active' ||
      account.role === 'admin' ||
      !ROLES_BY_AUDIENCE[audience].includes(account.role)
    ) {
      return err(accountNotFound());
    }

    await recordFailedAttempt(tx, 'login_ip', ipKey, now, throttle.windowMinutes);

    const token = ctx.ports.tokens.issue();
    const sessionId = ctx.ids.next<'SessionId'>();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 3_600_000);

    await createSession(tx, {
      id: sessionId,
      userId: account.id,
      tokenHash: ctx.ports.tokens.fingerprint(token),
      audience,
      expiresAt,
      ip: ctx.request?.ip ?? null,
      userAgent: ctx.request?.userAgent ?? null,
    });

    await audit({
      action: 'session.created',
      subjectType: 'user',
      subjectId: account.id,
      metadata: { sessionId, role: account.role, audience, demo: true },
    });

    return ok({
      token,
      expiresAt,
      user: { id: account.id, fullName: account.fullName, role: account.role },
    });
  });
}
