import { expect, test } from '@playwright/test';

import { APPS, DONOR, STAFF_ROLES } from '../fixtures/apps';

/**
 * The landing page on the bare name.
 *
 * It sends a donor to the chat on the same origin and each member of staff to
 * their own application's sign-in. Each application is a separate origin
 * (§13), so the staff links are checked by where they point, not followed.
 */

test('leads a donor to the chat', async ({ page }) => {
  await page.goto(`${DONOR.origin}/`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'I want to give blood' }).click();
  await expect(page).toHaveURL(`${DONOR.origin}/chat`);
  await expect(page.getByRole('log', { name: 'Conversation' })).toBeVisible();
});

test('links each member of staff to their own application', async ({ page }) => {
  await page.goto(`${DONOR.origin}/`);
  const staff = page.getByRole('region', { name: 'Hospital staff' });

  for (const role of STAFF_ROLES) {
    await expect(staff.locator(`a[href="${APPS[role].origin}/sign-in"]`)).toHaveCount(1);
  }
  await expect(
    page.getByRole('link', { name: 'See what is needed now' }),
  ).toHaveAttribute('href', `${APPS.volunteer.origin}/board`);
});

test('passes a request link that still lands on / to the chat', async ({ page }) => {
  // Links printed or forwarded before the chat moved to /chat carry ?r= on /.
  await page.goto(`${DONOR.origin}/?r=BC-ABCD2345`);
  await expect(page).toHaveURL(`${DONOR.origin}/chat?r=BC-ABCD2345`);

  await page.goto(`${DONOR.origin}/r/BC-ABCD2345`);
  await expect(page).toHaveURL(`${DONOR.origin}/chat?r=BC-ABCD2345`);
});
