import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

import { APPS, DONOR } from './fixtures/apps';

/**
 * The browser suite (docs/playwright-automation-plan.md).
 *
 * Five applications, one loop. The `journey` project is the demonstration: a
 * doctor raises a request, the centre answers it, the donor app recruits a
 * donor, the counter records the donation, and everyone is told how it ended.
 * The other projects are coverage around it.
 *
 * The suite reads the workspace `.env` so it points at the same stack the
 * applications use, and it reuses servers that are already running: with
 * `pnpm dev` up, `pnpm e2e` runs against it. In CI, `webServer` starts the
 * production builds itself.
 */

const root = path.resolve(import.meta.dirname, '..');
const rootEnv = path.join(root, '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const ci = process.env['CI'] === 'true';

/** `E2E_SLOWMO=500 pnpm e2e:show` makes every action watchable. */
const slowMo = Number(process.env['E2E_SLOWMO'] ?? '0');

/**
 * How long a step may wait on the ticker. Three ticks plus a poll of the chat
 * screen: 15 s ticks locally are the default, 2 s in CI where the server is
 * started with `BOT_TICK_INTERVAL_MS` set below.
 */
export const TICK_MS = Number(process.env['BOT_TICK_INTERVAL_MS'] ?? '15000');
export const TICKER_WAIT_MS = TICK_MS * 3 + 10_000;

/** The showcase's slow motion per action, by `SHOWCASE_SPEED`. */
const SHOWCASE_SLOWMO: Readonly<Record<string, number>> = { slow: 700, normal: 350, fast: 80 };

const serverFor = (filter: string, origin: string, env: Record<string, string> = {}) => ({
  command: `pnpm --filter ${filter} start`,
  url: `${origin}/api/health`,
  reuseExistingServer: !ci,
  timeout: 120_000,
  cwd: root,
  env: { ...process.env, ...env } as Record<string, string>,
});

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.ts',
  // The journey is one test with many steps and real waits on the ticker.
  timeout: 10 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: ci ? 1 : 0,
  reporter: ci ? [['html', { open: 'never' }], ['github']] : [['list'], ['html', { open: 'never' }]],
  outputDir: './test-results',

  use: {
    trace: ci ? 'on-first-retry' : 'retain-on-failure',
    // `E2E_VIDEO=on` keeps a recording of every run, which is the demo
    // plan's fallback if the phone cannot reach the laptop on the day.
    video: process.env['E2E_VIDEO'] === 'on' ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { slowMo },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: 'journey',
      testMatch: /05-the-loop\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'staff',
      testMatch: /0[1-3]-.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'donor',
      testMatch: /0[4|7]-.*\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      /**
       * The showcase: the system used visibly, one flow at a time, with
       * captions (showcase/showcase.spec.ts). Headed, slowed, and never part
       * of `pnpm e2e`; it is a demonstration that happens to run on the test
       * runner. Its own slow motion, independent of E2E_SLOWMO.
       */
      name: 'showcase',
      testDir: './showcase',
      testMatch: /showcase\.spec\.ts/,
      timeout: 60 * 60_000,
      retries: 0,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        video: 'off',
        trace: 'off',
        launchOptions: {
          slowMo: SHOWCASE_SLOWMO[process.env['SHOWCASE_SPEED'] ?? 'normal'] ?? 350,
          args: ['--window-position=40,40', '--window-size=1320,900'],
        },
      },
    },
  ],

  webServer: [
    serverFor('@obdm/doctor-app', APPS.doctor.origin),
    serverFor('@obdm/admin', APPS.admin.origin),
    serverFor('@obdm/centre-app', APPS.centre.origin),
    serverFor('@obdm/volunteer-app', APPS.volunteer.origin),
    serverFor('@obdm/donor-app', DONOR.origin, {
      BOT_TICK_INTERVAL_MS: process.env['BOT_TICK_INTERVAL_MS'] ?? (ci ? '2000' : '15000'),
    }),
  ],
});
