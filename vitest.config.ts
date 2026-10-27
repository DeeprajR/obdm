import { defineConfig } from 'vitest/config';
import path from 'node:path';

const pkg = (name: string): string =>
  path.resolve(import.meta.dirname, `packages/${name}/src/index.ts`);

/**
 * Tests run against the packages' **source**, not their build output, so a
 * failing test points at the file you would edit. The published entry point is
 * still what is aliased, so nothing in a test can reach past a package boundary
 * that production code could not (§11.2).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@obdm/result': pkg('result'),
      '@obdm/ids': pkg('ids'),
      '@obdm/domain': pkg('domain'),
      '@obdm/config': pkg('config'),
      '@obdm/contract': pkg('contract'),
      '@obdm/testing': pkg('testing'),
      '@obdm/platform': pkg('platform'),
      '@obdm/hospital': pkg('hospital'),
      '@obdm/centre': pkg('centre'),
      '@obdm/bot': pkg('bot'),
      '@obdm/volunteer': pkg('volunteer'),
      '@obdm/ops': pkg('ops'),
      // The web app's own path alias, so its module tests import exactly what
      // the app imports.
      // The longer alias first: Vite matches by prefix, so `@obdm/db`
      // would otherwise swallow `@obdm/db/bot` and resolve it to a
      // path that does not exist.
      '@obdm/db/bot': path.resolve(import.meta.dirname, 'db/src/schema-bot/index.ts'),
      '@obdm/db': path.resolve(import.meta.dirname, 'db/src/index.ts'),

    },
  },
  test: {
    include: ['{packages,db,apps}/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    // Real Postgres, one file at a time: two suites truncating the same tables
    // at once is not the race we are testing (§17). The races that matter are
    // set up deliberately, with `runConcurrently` from packages/testing.
    fileParallelism: false,
    // Brings the test database up to the current migrations before anything
    // runs, and reports that the database suites are skipping when there is no
    // TEST_DATABASE_URL.
    globalSetup: ['./db/vitest.setup.ts'],
  },
});
