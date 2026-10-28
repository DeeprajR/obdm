import 'server-only';

/**
 * The demonstration account this application lets anyone into, if any.
 *
 * Set per application (`DEMO_ACCOUNT`, an account's email) while the
 * prototype is being shown to people without accounts; unset, the sign-in
 * page is the password form and nothing else. Read on each request, so
 * turning it off is a restart, not a rebuild.
 */
export function demoAccount(): string | null {
  const configured = process.env['DEMO_ACCOUNT']?.trim();
  if (!configured) return null;
  return configured;
}
