/**
 * Throttling the chat route (§3, §13, ADR 0017 §8).
 *
 * A chat platform rate-limited the bot on our behalf. The web channel has no
 * platform, the chat route is public by design, and every post writes a row to
 * the transcript, so one device could fill the table as fast as it can send.
 * This is the limit the platform used to be.
 *
 * The same design as the sign-in throttle, for the same reasons: **in the
 * database**, so it survives a restart and applies across every instance of
 * the donor application; **fixed windows**, one row per key per window, which
 * is wrong only at a boundary, where being wrong means allowing at most twice
 * the limit across two adjacent windows. For a nuisance control that is the
 * right trade, and it keeps the table small.
 *
 * Three keys. The device, which is the hash of the cookie and is what a person
 * sees as "me"; the caller's address, which bounds what one network can send;
 * and the same address again, counting only requests that minted a new
 * device. A script can drop its cookie and be a new device every time, so the
 * device key alone bounds nothing; how fast one address can be new is what
 * does. Neither names anyone. A missing address counts nothing against anyone
 * rather than pooling every unknown caller under one key.
 */

import { isIP } from 'node:net';
import { lt, sql } from 'drizzle-orm';
import { chatRateLimits, type ChatRateLimitScope } from '@obdm/db/bot';

import type { BotDatabase } from './db.js';

export type RateLimitPolicy = {
  readonly windowMinutes: number;
  readonly maxAttempts: number;
};

/**
 * Generous for a person, tight for a script. The interview is a tap every few
 * seconds at most; thirty a minute is more than a thumb manages.
 *
 * The address allowance is wide on purpose. Indian mobile carriers put large
 * populations behind one shared address, and a wave is exactly the moment
 * many of them answer at once: a few dozen donors on one carrier address,
 * each a dozen taps into the visit questions, must not read as a flood. What
 * it bounds is one address minting devices faster than any crowd of people
 * could.
 */
export const CHAT_RATE_LIMITS: Readonly<Record<ChatRateLimitScope, RateLimitPolicy>> = {
  device: { windowMinutes: 1, maxAttempts: 30 },
  ip: { windowMinutes: 1, maxAttempts: 300 },
  // A crowd behind one carrier address registering at once after a poster is
  // a few a minute; a script shedding its cookie is hundreds.
  new_device: { windowMinutes: 1, maxAttempts: 20 },
};

/**
 * The caller's address, for the key and nothing else (§3).
 *
 * The **rightmost** forwarded entry, which the nearest proxy wrote, never the
 * leftmost, which the client sent and could vary per request to escape the
 * count. Only if it is an address: anything else was typed, and a typed key
 * is both forgeable and, past a few kilobytes, too long for the index. No
 * proxy means no header, and the caller counts nothing against anyone, which
 * is the development case. The same rule as the staff sign-in throttle's.
 */
export function callerAddressFrom(
  forwardedFor: string | null | undefined,
  realIp: string | null | undefined,
): string | null {
  const candidates = [
    ...(forwardedFor ?? '').split(',').map((entry) => entry.trim()).reverse(),
    (realIp ?? '').trim(),
  ];
  for (const candidate of candidates) {
    if (candidate !== '' && isIP(candidate) !== 0) return candidate;
  }
  return null;
}

/**
 * The throttle key for an address. IPv6 is keyed on its /64, the block one
 * subscriber is given: a single machine can rotate through the low 64 bits at
 * will, so keying on the whole address would bound nothing. An IPv4-mapped
 * address is its IPv4 address.
 */
export function throttleKeyOf(address: string | null): string | null {
  if (address === null) return null;
  if (isIP(address) !== 6) return address;

  const lower = address.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped?.[1]) return mapped[1];

  const [head = '', tail = ''] = lower.split('::');
  const left = head === '' ? [] : head.split(':');
  const right = tail === '' ? [] : tail.split(':');
  const groups = lower.includes('::')
    ? [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right]
    : left;
  return `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/**
 * The caller's address from a request's headers.
 *
 * Behind Cloudflare, `CLIENT_IP_HEADER=cf-connecting-ip` names the header the
 * edge sets to the visitor's address and overwrites whatever the client sent.
 * Trusted only because, behind the tunnel, nothing reaches the application
 * except through that edge; behind Caddy, or with a port published, a client
 * could write it, so it stays unset there and the forwarded-for rule applies.
 */
export function callerAddressFromHeaders(
  get: (name: string) => string | null,
  trustedHeader: string | undefined = process.env['CLIENT_IP_HEADER'],
): string | null {
  if (trustedHeader) {
    const value = (get(trustedHeader) ?? '').trim();
    return isIP(value) !== 0 ? value : null;
  }
  return callerAddressFrom(get('x-forwarded-for'), get('x-real-ip'));
}

export type RateLimitDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly scope: ChatRateLimitScope;
      /** Until the current window closes, which is when the count resets. */
      readonly retryAfterSeconds: number;
    };

export type RateLimitKeys = {
  readonly device: string;
  readonly ip: string | null;
  /** True when this request minted the device: counted against the address. */
  readonly newDevice?: boolean;
};

/** The instant the current fixed window opened. */
const windowStartFor = (now: Date, windowMinutes: number): Date => {
  const windowMs = windowMinutes * 60_000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
};

const secondsUntilWindowEnds = (now: Date, windowMinutes: number): number => {
  const windowMs = windowMinutes * 60_000;
  const start = windowStartFor(now, windowMinutes).getTime();
  return Math.max(1, Math.ceil((start + windowMs - now.getTime()) / 1000));
};

/**
 * Counts one request against each key and says whether it may proceed.
 *
 * One statement per key, so two simultaneous posts cannot both read 29 and
 * both write 30. The unique index on `(scope, key, window_start)` is what
 * makes the upsert safe. Every request is counted, allowed or not: a refused
 * request still cost a round trip, and a device that keeps hammering keeps
 * being refused rather than earning a fresh allowance by being refused.
 */
export async function takeChatToken(
  db: BotDatabase,
  keys: RateLimitKeys,
  now: Date,
  policies: Readonly<Record<ChatRateLimitScope, RateLimitPolicy>> = CHAT_RATE_LIMITS,
): Promise<RateLimitDecision> {
  const ip = throttleKeyOf(keys.ip);
  const scopes: readonly { scope: ChatRateLimitScope; key: string | null }[] = [
    { scope: 'device', key: keys.device },
    { scope: 'ip', key: ip },
    { scope: 'new_device', key: keys.newDevice === true ? ip : null },
  ];

  let refusal: RateLimitDecision | undefined;

  for (const { scope, key } of scopes) {
    if (key === null) continue;
    const policy = policies[scope];

    const [row] = await db
      .insert(chatRateLimits)
      .values({ scope, key, windowStart: windowStartFor(now, policy.windowMinutes), attempts: 1 })
      .onConflictDoUpdate({
        target: [chatRateLimits.scope, chatRateLimits.key, chatRateLimits.windowStart],
        set: { attempts: sql`${chatRateLimits.attempts} + 1`, updatedAt: now },
      })
      .returning({ attempts: chatRateLimits.attempts });

    const attempts = row?.attempts ?? 1;
    if (attempts > policy.maxAttempts && refusal === undefined) {
      refusal = {
        allowed: false,
        scope,
        retryAfterSeconds: secondsUntilWindowEnds(now, policy.windowMinutes),
      };
    }
  }

  return refusal ?? { allowed: true };
}

/**
 * Removes windows nobody will ask about again. The longest window is a
 * minute; anything older than `before` is a row with no reader.
 */
export async function pruneChatRateLimits(db: BotDatabase, before: Date): Promise<number> {
  const rows = await db
    .delete(chatRateLimits)
    .where(lt(chatRateLimits.windowStart, before))
    .returning({ scope: chatRateLimits.scope });
  return rows.length;
}
