/**
 * Where each application is served (§1, ADR 0016).
 *
 * The four applications are separate deployments on separate origins, so
 * anything that crosses between them is an absolute URL: an invite emailed by
 * administration opens in the doctor app, an address-change link opens in the
 * application of the account that asked for it, and the control panel links an
 * alert to the centre app. This is the one place those origins are read.
 *
 * The defaults are the development ports, so a fresh checkout works with no
 * configuration. A deployment sets all four.
 */

import type { Audience } from './domain/authorization.js';

const ORIGINS: Readonly<Record<Audience, { readonly env: string; readonly fallback: string }>> = {
  doctor: { env: 'DOCTOR_APP_URL', fallback: 'http://localhost:3000' },
  admin: { env: 'ADMIN_APP_URL', fallback: 'http://localhost:3001' },
  centre: { env: 'CENTRE_APP_URL', fallback: 'http://localhost:3002' },
  volunteer: { env: 'VOLUNTEER_APP_URL', fallback: 'http://localhost:3003' },
};

/** The origin of an application, with no trailing slash. */
export function appOrigin(audience: Audience): string {
  const { env, fallback } = ORIGINS[audience];
  return process.env[env]?.replace(/\/+$/, '') ?? fallback;
}
