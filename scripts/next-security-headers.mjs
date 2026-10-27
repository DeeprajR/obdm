/**
 * The response headers every application sends (§13).
 *
 * One file, imported by each application's `next.config.ts`, so the five
 * deployments cannot drift: a header relaxed for one screen would be relaxed
 * for one application and nobody would notice until a scan did.
 *
 * What each one closes:
 *
 *  - `Content-Security-Policy` keeps script, style and connections on the
 *    application's own origin. The applications load nothing from anywhere
 *    else: fonts are self-hosted, seals are served through an authenticated
 *    route on the same origin, and nothing in a page calls another
 *    application by script (§13, "no CORS policy, because nothing needs one").
 *    `'unsafe-inline'` for script is the cost of the framework's own hydration
 *    scripts without a per-request nonce; the same-origin restriction on where
 *    script may be *loaded from* still holds. `frame-ancestors 'none'` is the
 *    clickjacking control; `X-Frame-Options` repeats it for older browsers.
 *  - `Strict-Transport-Security` pins the browser to https for two years once
 *    it has seen the site over https. Production only: on a development server
 *    over plain http the browser ignores it anyway.
 *  - `Referrer-Policy` keeps a request's uuid out of the referrer a link to
 *    another origin would otherwise carry.
 *  - `Permissions-Policy` says no to the device features nothing here uses.
 *
 * Not set: `form-action`. A server action that finishes somewhere else, the
 * password reset completed at the wrong application (§13), answers a form post
 * with a cross-origin redirect, and a browser applies `form-action` to that
 * redirect. Every mutating request is already refused unless it is
 * same-origin, which is the control that matters.
 *
 * In development the framework evaluates source maps with `eval`, so
 * `'unsafe-eval'` is allowed there and nowhere else.
 */

/**
 * @param {{ development: boolean }} options
 * @returns {Promise<Array<{ source: string, headers: Array<{ key: string, value: string }> }>>}
 */
export async function securityHeaders({ development }) {
  const script = development ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

  const policy = [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(development ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const headers = [
    { key: 'Content-Security-Policy', value: policy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
    ...(development
      ? []
      : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
  ];

  return [{ source: '/:path*', headers }];
}
