import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { WEB_CHANNEL, type ChannelAddress } from '@obdm/bot';

/**
 * Who is talking (§2.11, ADR 0017).
 *
 * A chat platform hands the bot a user id it vouches for. A browser hands it
 * nothing, so this application issues one: a random token in an `httpOnly`
 * cookie, and the channel user id is the token's SHA-256. The database holds
 * the hash and never the bearer, the same arrangement the staff sessions use.
 *
 * What this buys and what it costs, both deliberate:
 *
 *  - A person is their device. Clear the cookie or change phones and the bot
 *    meets a stranger, who registers again. Linking the two is the verified
 *    phone number's job (§2.11), and the web cannot verify one; that stays
 *    open until a channel that can is added.
 *  - Nothing in a request body can say who the person is. The address comes
 *    from here, resolved on the server, or it does not exist (§2.5, §13).
 *
 * The cookie is renewed on every call, so an installed application that is
 * opened now and then keeps its identity for as long as it is used.
 */
export const DEVICE_COOKIE = 'bc_donor_chat';

/** 32 random bytes, base64url: 43 characters, no padding. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** The longest a browser will keep a cookie: 400 days. */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

const addressOf = (token: string): ChannelAddress => ({
  channel: WEB_CHANNEL,
  channelUserId: createHash('sha256').update(token).digest('hex'),
});

export async function deviceAddress(): Promise<{
  readonly address: ChannelAddress;
  /** True when this call minted the identity: a first visit, or a lost cookie. */
  readonly issued: boolean;
}> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  const issued = existing === undefined || !TOKEN.test(existing);
  const token = issued ? randomBytes(32).toString('base64url') : existing;

  store.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });

  return { address: addressOf(token), issued };
}
