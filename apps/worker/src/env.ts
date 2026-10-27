/**
 * The workspace root `.env`, loaded before anything reads a variable from it.
 *
 * A module of its own, imported first, because ESM evaluates every static
 * import before the importing module's body runs: the platform package opens
 * its connection pool at import time and reads `DATABASE_URL` as it does, so a
 * load placed in `main.ts` would run after the thing it was meant to feed.
 *
 * This runs as plain Node, so nothing loads the file otherwise. A value
 * already in the environment wins, which is how a deployment configures it;
 * and a file means a developer's machine, which the production boot check
 * reads from the marker and stands down.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import { ENV_FROM_FILE } from '@obdm/config';

const rootEnv = path.resolve(import.meta.dirname, '..', '..', '..', '.env');
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
  process.env[ENV_FROM_FILE] = rootEnv;
}
