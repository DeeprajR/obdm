import { expect, test } from '@playwright/test';

import { APPS, PASSWORD, STAFF_ROLES, type StaffRole } from '../fixtures/apps';
import { storageStateFor } from '../fixtures/roles';

/**
 * One application per role (ADR 0016).
 *
 * Each seeded account signs in to its own application and lands where the
 * README says. At any other application it is refused exactly like a wrong
 * password: the same sentence, and nothing that would say the account exists
 * somewhere else.
 */

const OTHERS: Readonly<Record<StaffRole, StaffRole>> = {
  doctor: 'centre',
  centre: 'volunteer',
  volunteer: 'doctor',
  admin: 'doctor',
};

for (const role of STAFF_ROLES) {
  const app = APPS[role];

  test(`${role} is signed in at its own application and lands on ${app.landing}`, async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStateFor(role) });
    const page = await context.newPage();

    await page.goto(`${app.origin}${app.landing}`);
    await expect(page).toHaveURL(new RegExp(`${app.landing}$`));
    // Signed in: the sign-in card is not what is shown.
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);

    await context.close();
  });

  test(`${role} is refused at the ${OTHERS[role]} application like a wrong password`, async ({ page }) => {
    const wrong = APPS[OTHERS[role]];
    await page.goto(`${wrong.origin}/sign-in`);
    await page.getByLabel('Email address').fill(app.email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Next's own route announcer is also role=alert and empty, so the one with words is the form's.
    const problem = page.getByRole('alert').filter({ hasText: /\S/ });
    await expect(problem).toContainText(/incorrect/i);
    // Still on the sign-in page, and the body says nothing about another app.
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(problem).not.toContainText(/another|other application|wrong app/i);
  });
}

test('a session cookie from one application is inert at another', async ({ browser }) => {
  // The doctor's saved session, presented to the centre application.
  const context = await browser.newContext({ storageState: storageStateFor('doctor') });
  const page = await context.newPage();

  await page.goto(`${APPS.centre.origin}/centre`);
  await expect(page).toHaveURL(/\/sign-in/);

  await context.close();
});
