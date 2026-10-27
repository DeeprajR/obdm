/**
 * The caller's address, for a throttle key and nothing else (§3, §13).
 *
 * Behind a proxy the socket address is the proxy's, so the address has to be
 * read from what the proxy forwarded. Which entry is read decides whether the
 * throttle can be bypassed:
 *
 *  - The **leftmost** `X-Forwarded-For` entry is whatever the client sent,
 *    because a proxy appends to the header rather than replacing it. A script
 *    that sends a different value per request would never share a key with
 *    itself, and a per-address limit keyed on it would bound nothing.
 *  - The **rightmost** entry was written by the nearest proxy, which is ours.
 *    Behind one proxy it is the client; behind two trusted proxies it is the
 *    outer proxy's address, which is coarser than ideal and still a key the
 *    client cannot choose.
 *
 * So the rightmost entry is read, and only if it is an IP address: a value
 * that is not one is a value somebody typed, and a key built from it would be
 * both forgeable and, past a few kilobytes, too long for the index that keeps
 * the throttle's upsert atomic. With no proxy at all there is no header, the
 * socket address is not available to a route handler, and the caller counts
 * nothing against anyone, which is the development case.
 *
 * Never an identity, never an access decision: a throttle key is the whole of
 * what this is for.
 */

import { isIP } from 'node:net';

export function clientAddress(
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
