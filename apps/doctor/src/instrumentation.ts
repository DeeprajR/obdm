/**
 * The other half of the metrics (§11.9).
 *
 * `notePage` records a render that finished. A render that threw never reaches
 * it, and those are exactly the rows an operator most wants to see, so the
 * framework's own error hook records them instead.
 *
 * **Node only, and split into a second file to keep it that way.** Next bundles
 * this module for the Edge runtime as well, where a native module cannot load:
 * importing the database layer directly from here broke every page in the app
 * with a resolution error for Argon2's WASM build. The dynamic import behind
 * the runtime check is Next's documented shape for exactly this.
 */

/**
 * Refuses to start unconfigured (§13).
 *
 * Every adapter has a development default, and a production process that
 * fell back to one would run and look fine: invites pointing at localhost,
 * seals written to a MinIO that is not there. The rules are data in
 * `@obdm/config`; the decision to refuse is taken here, once, and
 * only in production, so a fresh checkout still starts with no configuration.
 */
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;

  const { WEB_RUNTIME_RULES, refuseToStartUnconfigured } = await import('@obdm/config');
  refuseToStartUnconfigured(WEB_RUNTIME_RULES);
}

export async function onRequestError(
  _error: unknown,
  request: { path?: string; method?: string },
): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;

  try {
    const { recordFailedRender } = await import('./lib/record-failure');
    await recordFailedRender('doctor', request);
  } catch {
    // Recording a failure must never become a second failure.
  }
}
