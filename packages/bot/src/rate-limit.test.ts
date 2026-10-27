import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { chatRateLimits } from '@obdm/db/bot';

import { createBotDatabase } from './db.js';
import {
  callerAddressFrom,
  pruneChatRateLimits,
  takeChatToken,
  type RateLimitPolicy,
} from './rate-limit.js';

const testUrl = process.env['TEST_DATABASE_URL'];

describe.skipIf(!testUrl)('the chat throttle (§3, ADR 0017 §8)', () => {
  const client = postgres(testUrl ?? '', { max: 1, onnotice: () => undefined });
  const db = createBotDatabase(testUrl ?? '');

  /** Small, so the suite does not post thirty times to see a refusal. */
  const policies: Record<'device' | 'ip', RateLimitPolicy> = {
    device: { windowMinutes: 1, maxAttempts: 3 },
    ip: { windowMinutes: 1, maxAttempts: 5 },
  };

  // Ten seconds into a minute, so the window has fifty seconds left.
  const now = new Date('2026-10-26T09:00:10.000Z');

  beforeEach(async () => {
    await client`TRUNCATE bot.chat_rate_limits`;
  });

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  it('allows up to the limit and refuses the next, saying when to come back', async () => {
    const keys = { device: 'device-a', ip: '10.0.0.1' };

    for (let i = 0; i < 3; i += 1) {
      expect(await takeChatToken(db, keys, now, policies)).toEqual({ allowed: true });
    }

    const refused = await takeChatToken(db, keys, now, policies);
    expect(refused).toEqual({ allowed: false, scope: 'device', retryAfterSeconds: 50 });
  });

  it('counts a refused request too, so hammering earns nothing', async () => {
    const keys = { device: 'device-a', ip: null };
    for (let i = 0; i < 5; i += 1) await takeChatToken(db, keys, now, policies);

    const [row] = await db.select({ attempts: chatRateLimits.attempts }).from(chatRateLimits);
    expect(row?.attempts).toBe(5);
  });

  it('keeps devices apart and bounds a whole address', async () => {
    for (let i = 0; i < 3; i += 1) {
      await takeChatToken(db, { device: `device-${i}`, ip: '10.0.0.9' }, now, policies);
    }
    // Three devices, one post each: none is over its own limit.
    expect(await takeChatToken(db, { device: 'device-0', ip: '10.0.0.9' }, now, policies)).toEqual({
      allowed: true,
    });
    expect(await takeChatToken(db, { device: 'device-1', ip: '10.0.0.9' }, now, policies)).toEqual({
      allowed: true,
    });
    // The fifth post from the address was the last it gets this minute.
    expect(await takeChatToken(db, { device: 'device-2', ip: '10.0.0.9' }, now, policies)).toEqual({
      allowed: false,
      scope: 'ip',
      retryAfterSeconds: 50,
    });
  });

  it('starts afresh in the next window', async () => {
    const keys = { device: 'device-a', ip: null };
    for (let i = 0; i < 4; i += 1) await takeChatToken(db, keys, now, policies);

    const later = new Date('2026-10-26T09:01:00.000Z');
    expect(await takeChatToken(db, keys, later, policies)).toEqual({ allowed: true });
  });

  it('counts nothing against an unknown address', async () => {
    const keys = { device: 'device-a', ip: null };
    await takeChatToken(db, keys, now, policies);

    const rows = await db.select({ scope: chatRateLimits.scope }).from(chatRateLimits);
    expect(rows.map((r) => r.scope)).toEqual(['device']);
  });

  it('prunes windows older than the cut-off and keeps the rest', async () => {
    await takeChatToken(db, { device: 'old', ip: null }, new Date('2026-10-25T09:00:00.000Z'), policies);
    await takeChatToken(db, { device: 'new', ip: null }, now, policies);

    const removed = await pruneChatRateLimits(db, new Date('2026-10-26T08:00:00.000Z'));

    expect(removed).toBe(1);
    const rows = await db.select({ key: chatRateLimits.key }).from(chatRateLimits);
    expect(rows.map((r) => r.key)).toEqual(['new']);
  });
});

describe('the address key (§3)', () => {
  it('is the entry the nearest proxy wrote, never the one the client sent', () => {
    expect(callerAddressFrom('9.9.9.9, 1.2.3.4', null)).toBe('1.2.3.4');
    expect(callerAddressFrom('1.2.3.4', null)).toBe('1.2.3.4');
    expect(callerAddressFrom(null, '2001:db8::1')).toBe('2001:db8::1');
  });

  it('is nothing when the value is not an address, so it cannot be chosen or oversized', () => {
    expect(callerAddressFrom('unknown', null)).toBeNull();
    expect(callerAddressFrom('x'.repeat(5000), null)).toBeNull();
    expect(callerAddressFrom('', '')).toBeNull();
    expect(callerAddressFrom(undefined, undefined)).toBeNull();
  });
});
