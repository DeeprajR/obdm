import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

import { securityHeaders } from '../../scripts/next-security-headers.mjs';

/**
 * Load the workspace root `.env`.
 *
 * Next reads `.env` from the application directory, not from the root of a
 * monorepo, so without this, `pnpm dev` starts with no `DATABASE_URL` and the
 * first request that touches the database fails at runtime rather than at boot.
 *
 * One `.env` at the root rather than a copy per app, because the connection
 * strings, the bot token and the object-storage credentials are shared by the
 * web app, the worker, the bot and the seed runner. Two copies of a secret are
 * two things to keep in step, and the one that drifts is found the hard way.
 *
 * `loadEnvFile` does not overwrite a variable that is already set, so a value
 * exported in the shell or supplied by CI still wins.
 */
const rootEnv = path.resolve(import.meta.dirname, '..', '..', '.env');
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
  // Configuration from a file is a developer's machine, even under `next
  // start`; the production boot check reads this and stands down. A
  // deployment has no file and gets the check (docs/deployment.md §3).
  process.env['OBDM_ENV_FROM_FILE'] = rootEnv;
}

/**
 * A container image asks for the standalone build (docs/deployment.md): the
 * server, its traced dependencies and nothing else, with the monorepo root as
 * the tracing root so workspace packages are included. Off by default, so
 * `next start` on a developer's machine behaves as it always has.
 */
const standalone = process.env['NEXT_OUTPUT'] === 'standalone';

const config: NextConfig = {
  reactStrictMode: true,
  ...(standalone
    ? { output: 'standalone' as const, outputFileTracingRoot: path.resolve(import.meta.dirname, '..', '..') }
    : {}),
  // The same headers on every response from every application (§13).
  headers: () => securityHeaders({ development: process.env.NODE_ENV !== 'production' }),
  // The workspace packages are TypeScript source; Next compiles them itself
  // rather than requiring a build step between edit and reload.
  transpilePackages: [
    '@obdm/config',
    '@obdm/db',
    '@obdm/domain',
    '@obdm/ids',
    '@obdm/platform',
    '@obdm/result',
  ],
  serverExternalPackages: ['postgres', '@node-rs/argon2'],
  poweredByHeader: false,
  typedRoutes: true,
};

export default config;
