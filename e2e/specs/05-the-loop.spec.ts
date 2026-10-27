import { devices, expect, test, type BrowserContext, type Page } from '@playwright/test';

import { APPS } from '../fixtures/apps';
import { ChatPage } from '../fixtures/chat';
import { storageStateFor } from '../fixtures/roles';
import { TICKER_WAIT_MS } from '../playwright.config';

/**
 * The loop in §1, end to end, through five applications.
 *
 * One test, many steps, so the report reads as the story a demo audience is
 * shown (docs/demo-plan.md §5): a doctor raises a request, the blood centre
 * answers it and the shortfall becomes donor demand, the donor app recruits
 * two donors, one confirms and gives, the counter records it and the donor is
 * thanked, and when the doctor cancels, the other donor is stood down. Then
 * the volunteer tiles and the administrator's trace show what happened.
 *
 * Run it visibly with `pnpm e2e:show`, slowly with `E2E_SLOWMO=600`, and keep
 * a recording with `E2E_VIDEO=on`.
 */

test.describe.configure({ mode: 'serial' });

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const donorAName = `Anita E2E ${stamp}`;
const donorBName = `Rahul E2E ${stamp}`;
const patientName = `SYN-PT E2E ${stamp}`;
const bagNumber = `SYN-E2E-${stamp}`;

/** The hospital's own district and city (seeded: Kozhikode), so both donors land in wave one. */
const PLACE = { district: 'Kozhikode', prefer: ['Kozhikode'] } as const;

const REQUEST_NUMBER = /\d{6}-\d{5}/;

async function staffPage(context: BrowserContext): Promise<Page> {
  return context.newPage();
}

test('the loop closes: request, decision, recruitment, donation, thanks, stand-down', async ({ browser }, info) => {
  /*
    Six browsers at once, built by hand rather than from the `page` fixture,
    so `use.video` does not reach them: the recording is asked for here, one
    file per window under the test's output folder, when `E2E_VIDEO=on`.
  */
  const recording =
    process.env['E2E_VIDEO'] === 'on'
      ? { recordVideo: { dir: info.outputPath('videos'), size: { width: 1280, height: 720 } } }
      : {};
  const phone = { ...devices['Pixel 7'], ...recording };
  const staff = (role: Parameters<typeof storageStateFor>[0]) => ({
    storageState: storageStateFor(role),
    ...recording,
  });

  const [doctorCtx, centreCtx, volunteerCtx, adminCtx, donorACtx, donorBCtx] = await Promise.all([
    browser.newContext(staff('doctor')),
    browser.newContext(staff('centre')),
    browser.newContext(staff('volunteer')),
    browser.newContext(staff('admin')),
    browser.newContext(phone),
    browser.newContext(phone),
  ]);

  const doctor = await staffPage(doctorCtx);
  const centre = await staffPage(centreCtx);
  const volunteer = await staffPage(volunteerCtx);
  const admin = await staffPage(adminCtx);
  const donorA = new ChatPage(await donorACtx.newPage());
  const donorB = new ChatPage(await donorBCtx.newPage());

  let requestNumber = '';
  let requestUrl = '';
  let rosterUrl = '';

  try {
    await test.step('Donor A opens the donor app and registers as B−', async () => {
      await donorA.open();
      await donorA.waitForBubble(/thank you for coming/);
      await donorA.register({
        phone: '9847000101',
        name: donorAName,
        group: 'B−',
        sex: 'Female',
        birthYear: '1994',
        ...PLACE,
      });
      // The answered questions are locked: the chosen option ticked, the rest inert (§8).
      expect(await donorA.chosenOn(/^What is your blood group/)).toBe('B−');
      expect(await donorA.chosenOn(/^Are you male or female/)).toBe('Female');
    });

    await test.step('Donor B registers as O−, a group that can give to a B− patient', async () => {
      await donorB.open();
      await donorB.waitForBubble(/thank you for coming/);
      await donorB.register({
        phone: '9847000102',
        name: donorBName,
        group: 'O−',
        sex: 'Male',
        birthYear: '1990',
        ...PLACE,
      });
    });

    await test.step('The doctor raises a request for 6 units of B− red cells', async () => {
      await doctor.goto(`${APPS.doctor.origin}/requests/new`);
      // The option grids are radios whose inputs are visually hidden, so they
      // are checked by label rather than clicked by text.
      await doctor.getByRole('radio', { name: 'B−', exact: true }).check({ force: true });
      // Six units, more than the seeded shelf holds, so the shortfall recruits donors.
      await doctor.getByRole('button', { name: '5+' }).click();
      await doctor.getByLabel('Units').fill('6');
      await doctor.getByRole('radio', { name: 'Urgent, today' }).check({ force: true });
      await doctor.getByRole('button', { name: 'Send to the blood centre' }).click();

      const handoff = doctor.getByRole('status').filter({ hasText: /bystander/ });
      await expect(handoff).toBeVisible();
      requestNumber = (REQUEST_NUMBER.exec((await handoff.innerText())))?.[0] ?? '';
      expect(requestNumber, 'a request number of the read-aloud shape').toMatch(REQUEST_NUMBER);
      requestUrl = doctor.url().split('?')[0] ?? doctor.url();
    });

    await test.step('The centre takes the patient from the bystander and issues what is on the shelf', async () => {
      await centre.goto(`${APPS.centre.origin}/centre/requests`);
      await centre.getByRole('link', { name: requestNumber }).click();

      await centre.getByLabel('Patient name').fill(patientName);
      await centre.getByLabel('IP number').fill(`SYN-IP-E2E-${stamp}`);
      await centre.getByLabel("Patient's own ABO group and RhD type").selectOption({ label: 'B−' });
      await centre.getByLabel('Age', { exact: true }).fill('34');
      await centre.getByRole('button', { name: 'Record the patient' }).click();
      // The page re-renders with the patient named on the request card.
      await expect(centre.getByRole('heading', { name: patientName })).toBeVisible();

      const shelf = centre.getByRole('status').filter({ hasText: /units are on the shelf|can be issued/ });
      await expect(shelf).toBeVisible();
      expect(await shelf.innerText(), 'the request must exceed the shelf, or nobody is recruited').toMatch(
        /of 6 units are on the shelf/,
      );

      await centre.getByRole('button', { name: /^Issue/ }).click();
      await expect(centre.getByText(/was raised with this answer/)).toBeVisible();
    });

    await test.step('The demand appears, and the bot picks it up', async () => {
      await centre.goto(`${APPS.centre.origin}/centre/demands`);
      const row = centre.getByRole('row').filter({ hasText: 'B−' }).filter({ hasText: 'Open' }).first();
      await expect(row).toBeVisible();
      await row.getByRole('link', { name: 'Roster' }).click();
      await expect(centre.getByRole('heading', { name: /B−/ })).toBeVisible();
      rosterUrl = centre.url();
    });

    await test.step('Both donors receive the request card', async () => {
      await donorA.waitForBubble(/needs B− blood/, TICKER_WAIT_MS);
      await donorB.waitForBubble(/needs B− blood/, TICKER_WAIT_MS);
      await expect(donorA.live('Yes, I can give')).toBeVisible();
      await expect(donorA.live('Not this time')).toBeVisible();
    });

    await test.step('Donor A says yes, answers the four visit questions, and is confirmed', async () => {
      await donorA.acceptAndScreen();
      await donorA.waitForBubble(/The centre is expecting you/);
      expect(await donorA.chosenOn(/Could you give/)).toBe('Yes, I can give');
    });

    await test.step('The counter sees donor A on the roster and records the donation', async () => {
      await centre.goto(rosterUrl);
      // The donor's card sits inside the "Expected at the counter" card, and
      // both are sections; the innermost is the last match.
      const card = centre
        .locator('section')
        .filter({ has: centre.getByRole('heading', { name: donorAName }) })
        .last();
      await expect(card).toBeVisible({ timeout: TICKER_WAIT_MS });
      await expect(card).toContainText('B−');

      await card.getByLabel('Outcome').selectOption('completed');
      await card.getByLabel('Unit number').fill(bagNumber);
      await card.getByRole('button', { name: 'Record' }).click();
      // The page re-renders: donor A leaves "Expected at the counter" for "Already marked".
      const marked = centre
        .locator('section')
        .filter({ has: centre.getByRole('heading', { name: 'Already marked' }) })
        .last();
      await expect(marked).toContainText(donorAName);
      await expect(marked).toContainText(bagNumber);
    });

    await test.step('Donor A is thanked with a next-eligible date', async () => {
      const thanks = await donorA.waitForBubble(/recorded your donation/, TICKER_WAIT_MS);
      await expect(thanks).toContainText(/You can give again from/);
    });

    await test.step('The volunteer dashboard shows the B− tile with donors coming', async () => {
      await volunteer.goto(`${APPS.volunteer.origin}/volunteer`);
      // The tiles print the raw group code, with an ASCII hyphen.
      const tile = volunteer.getByRole('link', { name: /^B- / });
      await expect(tile).toBeVisible();
      await expect(tile).toContainText(/messaged|confirmed|Covered/);
    });

    await test.step('The request is withdrawn, and donor B is stood down', async () => {
      test.info().annotations.push({ type: 'request', description: `${requestNumber} at ${requestUrl}` });
      await doctor.goto(requestUrl);
      await expect(doctor.getByRole('heading', { name: requestNumber, level: 1 })).toBeVisible();

      /*
        Two doors to the same ending (§7.6). A doctor may cancel a request the
        centre approved or partly approved; a request the shelf could not
        answer at all is recorded as declined with its demand still open, and
        then it is the centre that withdraws the demand. Which door is open
        depends on how much B− the shelf held when the request was decided,
        and the shelf runs down as this journey is repeated.
      */
      const cancel = doctor.getByRole('button', { name: 'Cancel this request' });
      if (await cancel.isVisible()) {
        await cancel.click();
        await doctor.getByLabel('Why is it being cancelled?').fill('E2E: patient referred');
        await doctor.getByRole('button', { name: 'Cancel the request' }).click();
        await expect(doctor.getByRole('status').filter({ hasText: /stood down/ })).toBeVisible();
      } else {
        await centre.goto(`${APPS.centre.origin}/centre/demands`);
        const row = centre.getByRole('row').filter({ hasText: 'B−' }).filter({ hasText: 'Open' }).first();
        await row.getByRole('button', { name: 'Withdraw' }).click();
        await row.getByLabel('Why is this being withdrawn?').fill('E2E: patient referred');
        await row.getByRole('button', { name: 'Withdraw the demand' }).click();
        await expect(centre.getByText(/Withdrawn\. Donors are being stood down|Withdrawn/).first()).toBeVisible();
      }

      const standDown = await donorB.waitForBubble(/no longer needed/, TICKER_WAIT_MS);
      await expect(standDown).toContainText(/withdrawn/);
      await expect(standDown).toContainText(/do not travel/);
    });

    await test.step('The administrator follows the request on the trace screen', async () => {
      await admin.goto(`${APPS.admin.origin}/panel`);
      const heartbeat = admin.locator('li').filter({ hasText: 'Donor bot' });
      await expect(heartbeat).toContainText('Reporting');

      await admin.goto(`${APPS.admin.origin}/panel/trace`);
      await admin.getByLabel('Identifier').fill(requestNumber);
      await admin.getByRole('button', { name: 'Follow it' }).click();

      const table = admin.getByRole('table');
      await expect(table).toContainText('Request raised');
      await expect(table).toContainText('Centre decided');
      await expect(table).toContainText('Demand raised');
      await expect(table).toContainText('Donor confirmed');
      // No donor's name reaches the trace (§11.9).
      await expect(table).not.toContainText(donorAName);
    });
  } finally {
    await Promise.all(
      [doctorCtx, centreCtx, volunteerCtx, adminCtx, donorACtx, donorBCtx].map((context) =>
        context.close(),
      ),
    );
  }
});
