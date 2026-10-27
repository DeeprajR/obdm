import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { CONFIG_DEFAULTS } from '@obdm/config';
import { accountInvites, users } from '@obdm/db';
import { newId, idGenerator } from '@obdm/ids';
import { createFakeClock } from '@obdm/testing';

import type { Database } from '../db.js';
import { argon2Hasher, nodeTokens } from '../adapters/crypto.js';
import type { Actor } from '../domain/authorization.js';
import type { UseCaseContext } from '../context.js';
import { consumeInvite } from './account.js';
import { setAccountStatus } from './doctors.js';

const testUrl = process.env['TEST_DATABASE_URL'];

describe.skipIf(!testUrl)('setAccountStatus (§13)', () => {
  const client = postgres(testUrl ?? '', { max: 5, onnotice: () => undefined });
  const db = drizzle(client) as unknown as Database;

  const clock = createFakeClock('2026-09-08T09:00:00.000Z');

  let adminId: string;
  const admin = (): Actor => ({ kind: 'user', userId: adminId, role: 'admin', districtScopeId: null });

  const context = (actor: Actor): UseCaseContext => ({
    db,
    clock,
    ids: idGenerator,
    ports: { hasher: argon2Hasher, tokens: nodeTokens },
    actor,
    correlationId: newId(),
    config: CONFIG_DEFAULTS,
    request: { ip: '10.0.0.1', userAgent: 'vitest' },
  });

  async function account(
    role: 'admin' | 'doctor',
    status: 'active' | 'pending_activation',
  ): Promise<string> {
    const id = newId();
    await db.insert(users).values({
      id,
      email: `${role}-${id}@obdm.invalid`,
      fullName: `${role} ${id.slice(0, 6)}`,
      role,
      status,
      passwordHash: status === 'active' ? 'x'.repeat(20) : null,
    });
    return id;
  }

  beforeEach(async () => {
    await client`TRUNCATE hospital.account_invites, hospital.email_deliveries, hospital.audit_log, hospital.sessions, hospital.users RESTART IDENTITY CASCADE`;
    adminId = await account('admin', 'active');
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  it('withdraws an invite nobody has opened yet', async () => {
    const invited = await account('doctor', 'pending_activation');
    const token = nodeTokens.issue();
    await db.insert(accountInvites).values({
      id: newId(),
      userId: invited,
      tokenHash: nodeTokens.fingerprint(token),
      expiresAt: new Date(clock.now().getTime() + 86_400_000),
      sentBy: adminId,
    });

    const result = await setAccountStatus(context(admin()), invited, 'deactivated');
    expect(result.ok).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.id, invited));
    expect(row?.status).toBe('deactivated');
    expect(row?.passwordHash).toBeNull();

    // The link that was out is dead: it is not a way back in.
    const opened = await consumeInvite(context(admin()), token, 'a-long-enough-password');
    expect(opened.ok).toBe(false);
    const [after] = await db.select().from(users).where(eq(users.id, invited));
    expect(after?.status).toBe('deactivated');
  });

  it('puts a never-activated account back to waiting for its invite on reactivation', async () => {
    const invited = await account('doctor', 'pending_activation');
    await setAccountStatus(context(admin()), invited, 'deactivated');

    const result = await setAccountStatus(context(admin()), invited, 'active');
    expect(result.ok).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.id, invited));
    expect(row?.status).toBe('pending_activation');
  });

  it('deactivates an administrator while another remains', async () => {
    const other = await account('admin', 'active');

    const result = await setAccountStatus(context(admin()), other, 'deactivated');
    expect(result.ok).toBe(true);
  });

  it('refuses to deactivate the last active administrator', async () => {
    const other = await account('admin', 'active');
    const otherActor: Actor = { kind: 'user', userId: other, role: 'admin', districtScopeId: null };

    await setAccountStatus(context(admin()), other, 'deactivated');
    // Reactivated, so there are two again, then each tries to remove the other
    // at the same instant. One may go; both may not.
    await setAccountStatus(context(admin()), other, 'active');

    const results = await Promise.all([
      setAccountStatus(context(admin()), other, 'deactivated'),
      setAccountStatus(context(otherActor), adminId, 'deactivated'),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const refused = results.flatMap((r) => (r.ok ? [] : [r.error.kind]));
    expect(refused).toEqual(['LastAdministrator']);

    const active = await db.select().from(users).where(eq(users.status, 'active'));
    expect(active.filter((row) => row.role === 'admin')).toHaveLength(1);
  });
});
