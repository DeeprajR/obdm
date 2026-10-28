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

/**
 * The caller's address from a request's headers, as a throttle key.
 *
 * Behind Cloudflare, `CLIENT_IP_HEADER=cf-connecting-ip` names the header the
 * edge sets to the visitor's address, overwriting anything the client sent.
 * Trusted only because, behind the tunnel, nothing reaches the application
 * except through that edge; behind Caddy, or with a port published, a client
 * could write it, so it stays unset there and the forwarded-for rule applies.
 *
 * IPv6 is keyed on its /64, the block one subscriber is given: one machine can
 * rotate through the low 64 bits at will, so the whole address bounds nothing.
 */
export function clientAddressFromHeaders(
  get: (name: string) => string | null,
  trustedHeader: string | undefined = process.env['CLIENT_IP_HEADER'],
): string | null {
  const address = trustedHeader
    ? (() => {
        const value = (get(trustedHeader) ?? '').trim();
        return isIP(value) !== 0 ? value : null;
      })()
    : clientAddress(get('x-forwarded-for'), get('x-real-ip'));
  return address === null ? null : prefixOf(address);
}

function prefixOf(address: string): string {
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
