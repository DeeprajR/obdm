import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, type Browser, type Page } from '@playwright/test';

import { APPS, PASSWORD, type StaffRole } from './apps';

/**
 * Staff sessions, signed in once and saved (ADR 0016).
 *
 * Each application has its own sign-in, cookie and session audience, so there
 * are four storage states and a test opens a context with the one it needs.
 * Global setup fills them; a test never types a staff password.
 */

const AUTH_DIR = path.resolve(import.meta.dirname, '..', '.auth');

export const storageStateFor = (role: StaffRole): string => path.join(AUTH_DIR, `${role}.json`);

/** Signs in on the page and leaves it on the landing page. */
export async function signIn(page: Page, role: StaffRole): Promise<void> {
  const app = APPS[role];
  await page.goto(`${app.origin}/sign-in`);
  await page.getByLabel('Email address').fill(app.email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(`${app.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${app.landing}`));
}

export async function saveSession(browser: Browser, role: StaffRole): Promise<void> {
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, role);
  await context.storageState({ path: storageStateFor(role) });
  await context.close();
}
