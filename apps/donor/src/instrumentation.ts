/**
 * Where the bot starts (ADR 0017).
 *
 * Next calls `register` once when the server boots. Node only: the module is
 * also evaluated for the Edge runtime, where the database driver cannot load,
 * so the import is dynamic and behind the runtime check, which is Next's own
 * shape for this.
 */
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;
  // The build has no database and starts no bot. A container image is built
  // where nothing listens on BOT_DATABASE_URL, and a refused start there would
  // be a build that can never be made.
  if (process.env['NEXT_PHASE'] === 'phase-production-build') return;

  // Unconfigured is a refused start, not a server on the development
  // defaults (§13). Only in production; a fresh checkout needs no .env edits.
  const { BOT_RUNTIME_RULES, refuseToStartUnconfigured } = await import('@obdm/config');
  refuseToStartUnconfigured(BOT_RUNTIME_RULES);

  const { startBotProcess } = await import('./lib/process');
  await startBotProcess();
}
