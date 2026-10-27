import { chromium } from '@playwright/test';

import { APPS, DONOR, STAFF_ROLES } from './fixtures/apps';
import { clearUndeliverableBacklog, publishBoard } from './fixtures/db';
import { saveSession } from './fixtures/roles';

/**
 * Before any test: the stack is up, the board is published, the backlog is
 * clear, and the four staff roles are signed in with their sessions saved.
 */

async function waitForHealth(origin: string, label: string): Promise<void> {
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    if (Date.now() > deadline) {
      throw new Error(`${label} at ${origin} did not answer /api/health. Is \`pnpm dev\` running?`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export default async function globalSetup(): Promise<void> {
  await Promise.all([
    ...STAFF_ROLES.map((role) => waitForHealth(APPS[role].origin, `${role} app`)),
    waitForHealth(DONOR.origin, 'donor app'),
  ]);

  await publishBoard();
  const cleared = await clearUndeliverableBacklog();
  if (cleared > 0) {
    process.stdout.write(`e2e: cleared ${String(cleared)} undeliverable outbox rows\n`);
  }

  const browser = await chromium.launch();
  try {
    for (const role of STAFF_ROLES) {
      await saveSession(browser, role);
    }
  } finally {
    await browser.close();
  }
}
