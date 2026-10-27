import { test } from '@playwright/test';

import { ALL, CHAPTERS, type Story } from './chapters';
import { Stage } from './stage';

/**
 * The showcase: the system used, visibly, one flow at a time.
 *
 * Not a test, although it runs through the test runner to borrow its browser,
 * its transpiler and its report. One window per role, brought to the front
 * when it is that role's turn; sign-ins on screen; a caption on the page for
 * every step; and pauses long enough to read them.
 *
 *   pnpm showcase                      the loop, headed
 *   $env:SHOWCASE = 'donor'            one application's flows
 *   $env:SHOWCASE = 'all'              the loop, then every application
 *   $env:SHOWCASE_SPEED = 'slow'       slow | normal | fast
 *   $env:E2E_VIDEO = 'on'              one recording per window
 *
 * Chapters: loop, doctor, centre, donor, volunteer, admin. Several at once:
 * `SHOWCASE=doctor,centre`.
 */

const SPEEDS: Readonly<Record<string, number>> = { slow: 2600, normal: 1600, fast: 400 };

const chaptersWanted = (): readonly string[] => {
  const raw = (process.env['SHOWCASE'] ?? 'loop').trim();
  if (raw === 'all') return ALL;
  const names = raw.split(',').map((name) => name.trim()).filter((name) => name.length > 0);
  for (const name of names) {
    if (!(name in CHAPTERS)) {
      throw new Error(`no chapter named "${name}". Chapters: ${Object.keys(CHAPTERS).join(', ')}, or all.`);
    }
  }
  return names;
};

test.describe.configure({ mode: 'serial' });

test('showcase', async ({ browser }, info) => {
  const pace = SPEEDS[process.env['SHOWCASE_SPEED'] ?? 'normal'] ?? SPEEDS['normal'] ?? 1600;
  const stage = new Stage(browser, {
    pace,
    videoDir: process.env['E2E_VIDEO'] === 'on' ? info.outputPath('videos') : undefined,
  });
  const story: Story = {
    stamp: new Date().toISOString().replace(/\D/g, '').slice(8, 14),
    signedIn: new Set(),
  };

  try {
    for (const name of chaptersWanted()) {
      const chapter = CHAPTERS[name];
      if (!chapter) continue;
      await test.step(name, () => chapter(stage, story));
    }
  } finally {
    await stage.close();
  }
});
