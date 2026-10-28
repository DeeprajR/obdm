import { expect, test } from '@playwright/test';

import { APPS, DONOR, STAFF_ROLES } from '../fixtures/apps';
import { ChatPage } from '../fixtures/chat';

/**
 * The landing page on the bare name, and the chat's welcome.
 *
 * The landing page says what OBDM is and that it is a prototype, sends a
 * donor to the chat on the same origin, and each member of staff to their own
 * application's sign-in. Each application is a separate origin (§13), so the
 * staff links are checked by where they point, not followed.
 */

test('says what OBDM is, and that it is a prototype', async ({ page }) => {
  await page.goto(`${DONOR.origin}/`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('A prototype, for demonstration only.');
  await expect(page.getByRole('note')).toContainText('without consultation');
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The applications' })).toBeVisible();
});

test('shows what is needed now, for every blood group', async ({ page }) => {
  await page.goto(`${DONOR.origin}/`);
  const demand = page.getByRole('region', { name: 'Blood needed now' });
  await expect(demand.getByRole('listitem')).toHaveCount(8);
  // Each group says either how many units or that none are needed.
  await expect(demand.getByRole('listitem').filter({ hasText: /units? needed|Not needed/ })).toHaveCount(8);
});

test('leads a donor to the chat, in a new tab', async ({ page }) => {
  await page.goto(`${DONOR.origin}/`);
  const [chat] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('link', { name: 'I want to give blood' }).click(),
  ]);
  await expect(chat).toHaveURL(`${DONOR.origin}/chat`);
  await expect(chat.getByRole('log', { name: 'Conversation' })).toBeVisible();
  // The landing page stays where it was.
  await expect(page).toHaveURL(`${DONOR.origin}/`);
});

test('opens every link that leaves the page in a new tab', async ({ page }) => {
  await page.goto(`${DONOR.origin}/`);
  const outgoing = page.locator('a:not([href^="#"])');
  const count = await outgoing.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(outgoing.nth(i)).toHaveAttribute('target', '_blank');
    await expect(outgoing.nth(i)).toHaveAttribute('rel', /noopener/);
  }
});

test('links each member of staff to their own application', async ({ page }) => {
  await page.goto(`${DONOR.origin}/`);
  const staff = page.getByRole('list', { name: 'Hospital staff' });

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
  await expect(page).toHaveURL(new RegExp(`^${DONOR.origin}/chat`));

  await page.goto(`${DONOR.origin}/r/BC-ABCD2345`);
  await expect(page).toHaveURL(new RegExp(`^${DONOR.origin}/chat`));
});

test('welcomes somebody new with what is needed, and asks nothing yet', async ({ page }) => {
  const chat = new ChatPage(page);
  await chat.open();

  // The live needs, as groups and counts or as "nothing is needed".
  const needs = page.getByRole('region', { name: 'Blood needed now' });
  await expect(needs).toBeVisible();
  await expect(needs).not.toContainText('Loading');

  // No question until they choose to register.
  await expect(page.getByRole('heading', { name: 'Give blood when someone nearby needs it' })).toBeVisible();
  await expect(chat.outgoing()).toHaveCount(0);

  await chat.begin();
  await chat.waitForBubble(/phone number/);
});
