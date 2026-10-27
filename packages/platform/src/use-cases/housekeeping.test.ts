import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { CONFIG_DEFAULTS } from '@obdm/config';
import {
  auditLog,
  authRateLimits,
  emailChangeRequests,
  passwordResetOtps,
  sessions,
  users,
} from '@obdm/db';
import { idGenerator, newId } from '@obdm/ids';
import { createFakeClock } from '@obdm/testing';

import type { Database } from '../db.js';
import { argon2Hasher, nodeTokens } from '../adapters/crypto.js';
import { systemActor } from '../domain/authorization.js';
import type { UseCaseContext } from '../context.js';
import { sweepExpiredCredentials } from './housekeeping.js';

const testUrl = process.env['TEST_DATABASE_URL'];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe.skipIf(!testUrl)('sweepExpiredCredentials (§12.3)', () => {
  const client = postgres(testUrl ?? '', { max: 5, onnotice: () => undefined });
  const db = drizzle(client) as unknown as Database;

  const clock = createFakeClock('2026-10-26T09:00:00.000Z');
  const now = clock.now();
  const at = (offsetMs: number): Date => new Date(now.getTime() + offsetMs);

  let userId: string;

  const context = (): UseCaseContext => ({
    db,
    clock,
    ids: idGenerator,
    ports: { hasher: argon2Hasher, tokens: nodeTokens },
    actor: systemActor('worker: credential sweep'),
    correlationId: newId(),
    config: CONFIG_DEFAULTS,
  });

  beforeEach(async () => {
    await client`TRUNCATE hospital.audit_log, hospital.sessions, hospital.auth_rate_limits,
      hospital.password_reset_otps, hospital.email_change_requests, hospital.users
      RESTART IDENTITY CASCADE`;

    userId = newId();
    await db.insert(users).values({
      id: userId,
      email: 'someone@obdm.invalid',
      fullName: 'Someone',
      role: 'doctor',
      // Not yet activated, so no hash is needed: the sweep never reads the account.
      status: 'pending_activation',
      passwordHash: null,
    });
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  const session = (id: string, expiresAt: Date, revokedAt: Date | null = null) => ({
    id,
    userId,
    tokenHash: `hash-${id}`,
    audience: 'doctor',
    expiresAt,
    revokedAt,
  });

  it('removes what expired more than a day ago and keeps everything else', async () => {
    const liveSession = newId();
    const expiredYesterday = newId();
    const expiredJustNow = newId();
    const revokedLongAgo = newId();
    const revokedJustNow = newId();

    await db.insert(sessions).values([
      session(liveSession, at(6 * HOUR)),
      session(expiredYesterday, at(-2 * DAY)),
      session(expiredJustNow, at(-1 * HOUR)),
      session(revokedLongAgo, at(6 * HOUR), at(-3 * DAY)),
      session(revokedJustNow, at(6 * HOUR), at(-1 * HOUR)),
    ]);

    const liveOtp = newId();
    const deadOtp = newId();
    await db.insert(passwordResetOtps).values([
      { id: deadOtp, userId, otpHash: 'a', expiresAt: at(-2 * DAY), supersededAt: at(-2 * DAY) },
      { id: liveOtp, userId, otpHash: 'b', expiresAt: at(10 * 60 * 1000) },
    ]);

    const liveChange = newId();
    const deadChange = newId();
    await db.insert(emailChangeRequests).values([
      {
        id: deadChange,
        userId,
        currentEmail: 'someone@obdm.invalid',
        newEmail: 'old@obdm.invalid',
        tokenHash: 'c',
        expiresAt: at(-3 * DAY),
        supersededAt: at(-3 * DAY),
      },
      {
        id: liveChange,
        userId,
        currentEmail: 'someone@obdm.invalid',
        newEmail: 'new@obdm.invalid',
        tokenHash: 'd',
        expiresAt: at(2 * HOUR),
      },
    ]);

    await db.insert(authRateLimits).values([
      { scope: 'login_ip', key: '10.0.0.1', windowStart: at(-2 * DAY), attempts: 3 },
      { scope: 'login_ip', key: '10.0.0.1', windowStart: at(-5 * 60 * 1000), attempts: 1 },
    ]);

    const result = await sweepExpiredCredentials(context());

    expect(result).toEqual({ sessions: 2, otps: 1, emailChanges: 1, rateLimitWindows: 1 });

    const remainingSessions = (await db.select({ id: sessions.id }).from(sessions)).map((r) => r.id);
    expect(remainingSessions.sort()).toEqual([liveSession, expiredJustNow, revokedJustNow].sort());

    expect((await db.select().from(passwordResetOtps)).map((r) => r.id)).toEqual([liveOtp]);
    expect((await db.select().from(emailChangeRequests)).map((r) => r.id)).toEqual([liveChange]);
    expect(await db.select().from(authRateLimits)).toHaveLength(1);
  });

  it('audits the counts and nothing else', async () => {
    await db.insert(sessions).values([session(newId(), at(-2 * DAY))]);

    await sweepExpiredCredentials(context());

    const rows = await db.select().from(auditLog).where(eq(auditLog.action, 'credentials.swept'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorKind).toBe('system');
    expect(rows[0]?.metadata).toMatchObject({ sessions: 1, otps: 0, emailChanges: 0, rateLimitWindows: 0 });
    expect(JSON.stringify(rows[0]?.metadata)).not.toContain('hash-');
  });

  it('is idempotent and silent when there is nothing to do', async () => {
    await db.insert(sessions).values([session(newId(), at(-2 * DAY))]);

    await sweepExpiredCredentials(context());
    const second = await sweepExpiredCredentials(context());

    expect(second).toEqual({ sessions: 0, otps: 0, emailChanges: 0, rateLimitWindows: 0 });
    expect(await db.select().from(auditLog)).toHaveLength(1);
  });
});
