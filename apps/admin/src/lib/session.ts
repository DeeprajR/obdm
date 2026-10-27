import 'server-only';

import { cookies, headers } from 'next/headers';

import { db } from '@obdm/platform';
import {
  clientAddress,
  isSameOrigin,
  nodeTokens,
  resolveActor,
  type Actor,
} from '@obdm/platform';

/**
 * The session cookie (§3, §13).
 *
 * `httpOnly` so script cannot read it, `sameSite=lax` so it does not ride along
 * on a cross-site POST, `secure` in production. The value is 256 bits of
 * randomness; only its SHA-256 is stored.
 */
export const SESSION_COOKIE = 'bc_admin_session';

/** This application. Sessions issued elsewhere do not resolve here (§1). */
export const AUDIENCE = 'admin' as const;

export const sessionCookieOptions = (expiresAt: Date) =>
  ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  }) as const;

export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

/**
 * The current principal, resolved from the cookie on the server.
 *
 * Identity is always read from here and never accepted from the client (§2.5,
 * §13), no form field, no header and no query parameter can say who the
 * doctor is.
 */
export async function currentActor(): Promise<Actor> {
  const token = await readSessionToken();
  if (!token) return { kind: 'anonymous' };
  return resolveActor(db, nodeTokens.fingerprint(token), new Date(), AUDIENCE);
}

/* -------------------------------------------------------------------------- */
/* CSRF                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Same-origin check on every mutating request (§3).
 *
 * `sameSite=lax` already blocks the cross-site POST that carries the cookie, so
 * this is the second of two independent controls rather than the only one. It
 * compares `Origin` against the request's own host: a form posted from another
 * site sends its own origin, and a browser will not let script forge the
 * header.
 *
 * A missing `Origin` is refused rather than allowed. Every browser that can run
 * this app sends it on a POST; treating absence as trustworthy is how these
 * checks get quietly bypassed.
 */
export async function assertSameOrigin(): Promise<void> {
  const headerList = await headers();
  const origin = headerList.get('origin');
  const host = headerList.get('host');

  if (!isSameOrigin(origin, host)) {
    // The message names neither value: it reaches a log, and an error page is
    // not the place to tell a caller what would have been accepted.
    throw new Error('CSRF: refusing a mutating request that is not same-origin');
  }
}

export async function requestMetadata(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  const headerList = await headers();
  // Behind a proxy the socket address is the proxy's. The entry the nearest
  // proxy wrote is read, validated as an address, and used only as a throttle
  // key, never as an identity or an access decision (`clientAddress`).
  const ip = clientAddress(headerList.get('x-forwarded-for'), headerList.get('x-real-ip'));

  return { ip, userAgent: headerList.get('user-agent') };
}
