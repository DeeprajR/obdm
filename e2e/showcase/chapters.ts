import { expect, type Page } from '@playwright/test';

import { APPS, DONOR } from '../fixtures/apps';
import { ChatPage } from '../fixtures/chat';
import { signIn } from '../fixtures/roles';
import { TICKER_WAIT_MS, TICK_MS } from '../playwright.config';
import type { Stage } from './stage';

/**
 * The chapters: one per application, and the loop that runs through all of
 * them. Each is self-contained enough to be played alone, and they share what
 * they make through `Story`, so the administrator's chapter can follow the
 * request the doctor's chapter raised.
 *
 * The words on the captions are the demo plan's and the user guides'. The
 * steps are the journey spec's, slowed down and said aloud.
 */

export type Story = {
  stamp: string;
  /** Roles whose window is already signed in, so a later chapter reuses it. */
  signedIn: Set<string>;
  requestNumber?: string;
  requestUrl?: string;
  rosterUrl?: string;
  donorA?: ChatPage;
  donorB?: ChatPage;
};

export type Chapter = (stage: Stage, story: Story) => Promise<void>;

const REQUEST_NUMBER = /\d{6}-\d{5}/;
const PLACE = { district: 'Kozhikode', prefer: ['Kozhikode'] } as const;

const seconds = (ms: number): string => `${String(Math.round(ms / 1000))} s`;

/**
 * A staff role's window, signed in on screen the first time and simply
 * brought to the front after that, so chapters can be played in any order.
 */
async function staffWindow(
  stage: Stage,
  story: Story,
  role: 'doctor' | 'centre' | 'volunteer' | 'admin',
  intro: { readonly chapter: string; readonly signIn: string },
): Promise<Page> {
  if (story.signedIn.has(role)) return stage.focus(role);
  const page = await stage.window(role, 'desktop', `${APPS[role].origin}/sign-in`);
  await stage.chapter(page, intro.chapter);
  await stage.during(page, intro.signIn, () => signIn(page, role));
  story.signedIn.add(role);
  return page;
}

/* -------------------------------------------------------------------------- */
/* The doctor                                                                  */
/* -------------------------------------------------------------------------- */

async function doctorSignsIn(stage: Stage, story: Story): Promise<Page> {
  const fresh = !story.signedIn.has('doctor');
  const page = await staffWindow(stage, story, 'doctor', {
    chapter: 'The doctor app, :3000. Doctors sign in here and nowhere else.',
    signIn: 'The doctor signs in with the seeded demo account.',
  });
  if (fresh) await stage.say(page, 'The dashboard: this doctor’s own requests, and the way to raise one.');
  return page;
}

async function doctorRaisesRequest(stage: Stage, story: Story, page: Page): Promise<void> {
  await page.goto(`${APPS.doctor.origin}/requests/new`);
  await stage.say(page, 'Four answers and an ID. Everything else is the blood centre’s to collect from the bystander (ADR 0010).');

  await stage.during(page, 'Blood group B−.', () =>
    page.getByRole('radio', { name: 'B−', exact: true }).check({ force: true }),
  );
  await stage.during(page, 'Six units: more than the shelf holds, so the shortfall will recruit donors.', async () => {
    await page.getByRole('button', { name: '5+' }).click();
    await page.getByLabel('Units').fill('6');
  });
  await stage.during(page, 'Urgent, today.', () =>
    page.getByRole('radio', { name: 'Urgent, today' }).check({ force: true }),
  );
  await stage.during(page, 'Send to the blood centre.', () =>
    page.getByRole('button', { name: 'Send to the blood centre' }).click(),
  );

  const handoff = page.getByRole('status').filter({ hasText: /bystander/ });
  await expect(handoff).toBeVisible();
  story.requestNumber = REQUEST_NUMBER.exec(await handoff.innerText())?.[0] ?? '';
  story.requestUrl = page.url().split('?')[0] ?? page.url();
  await stage.say(
    page,
    `The slip: ${story.requestNumber}. The doctor reads it to the patient’s bystander, who carries it to the blood centre.`,
    stage.pace * 2,
  );
}

export const doctor: Chapter = async (stage, story) => {
  const page = await doctorSignsIn(stage, story);
  await doctorRaisesRequest(stage, story, page);

  await stage.say(page, 'The request page is the record: what was asked for, the patient snapshot once the centre records it, and the centre’s answer.');
  await stage.say(page, 'The one thing a doctor can do after submitting: cancel. Every unit held and every donor asked is released with it.');
  await page.getByRole('button', { name: 'Cancel this request' }).click();
  await page.getByLabel('Why is it being cancelled?').fill('Showcase: raised in error');
  await stage.during(page, 'Cancelled, with a reason the centre will see.', () =>
    page.getByRole('button', { name: 'Cancel the request' }).click(),
  );
  await expect(page.getByRole('status').filter({ hasText: /Cancelled/ })).toBeVisible();
  await stage.say(page, 'The centre has been told. Nothing is chased for a patient who no longer needs it.', stage.pace * 1.5);
  // This request is spent; the next chapter raises its own.
  delete story.requestNumber;
  delete story.requestUrl;
};

/* -------------------------------------------------------------------------- */
/* The blood centre                                                            */
/* -------------------------------------------------------------------------- */

async function centreSignsIn(stage: Stage, story: Story): Promise<Page> {
  const fresh = !story.signedIn.has('centre');
  const page = await staffWindow(stage, story, 'centre', {
    chapter: 'The blood centre app, :3002. The counter, the fridge and the decision.',
    signIn: 'Blood centre staff sign in. A doctor’s account is refused here like a wrong password.',
  });
  if (fresh) {
    await stage.say(page, 'The dashboard: stock by group against the floor, the queue, and who is expected at the counter.');
  }
  return page;
}

async function centreDecides(stage: Stage, story: Story, page: Page): Promise<void> {
  if (!story.requestNumber) throw new Error('the centre chapter needs a request to decide');

  await page.goto(`${APPS.centre.origin}/centre/requests`);
  await stage.say(page, 'The queue, oldest need first, with the shelf for each group beside it.');
  await stage.during(page, `The bystander arrives with ${story.requestNumber}. The counter opens it.`, () =>
    page.getByRole('link', { name: story.requestNumber ?? '' }).click(),
  );

  await stage.say(page, 'Who is this for? The patient’s details come from the bystander, at the counter, not from the ward.');
  await page.getByLabel('Patient name').fill(`SYN-PT Showcase ${story.stamp}`);
  await page.getByLabel('IP number').fill(`SYN-IP-SC-${story.stamp}`);
  await page.getByLabel("Patient's own ABO group and RhD type").selectOption({ label: 'B−' });
  await page.getByLabel('Age', { exact: true }).fill('34');
  await stage.during(page, 'Recorded. A unit has to be traceable to a named person.', () =>
    page.getByRole('button', { name: 'Record the patient' }).click(),
  );
  await expect(page.getByRole('heading', { name: `SYN-PT Showcase ${story.stamp}` })).toBeVisible();

  const shelf = page.getByRole('status').filter({ hasText: /units are on the shelf|can be issued/ });
  await expect(shelf).toBeVisible();
  await stage.say(page, (await shelf.innerText()).trim(), stage.pace * 1.5);
  await stage.during(page, 'Issue what is on the shelf. The shortfall becomes donor demand in the same transaction (§7.2).', () =>
    page.getByRole('button', { name: /^Issue/ }).click(),
  );
  await expect(page.getByText(/was raised with this answer/)).toBeVisible();
  await stage.say(page, 'Answered. A donor demand was raised with the answer, and the bot will pick it up on its next tick.');

  await page.goto(`${APPS.centre.origin}/centre/demands`);
  await stage.say(page, 'Demand: what the shelf could not cover. "Notified" turns from "not picked up" into a count once the bot has it.');
  const row = page.getByRole('row').filter({ hasText: 'B−' }).filter({ hasText: 'Open' }).first();
  await expect(row).toBeVisible();
  await stage.during(page, 'The roster behind it: who said yes, and the counter’s three outcomes.', () =>
    row.getByRole('link', { name: 'Roster' }).click(),
  );
  await expect(page.getByRole('heading', { name: /B−/ })).toBeVisible();
  story.rosterUrl = page.url();
  await stage.say(page, 'Nobody is expected yet. Donors are being asked right now.');
}

export const centre: Chapter = async (stage, story) => {
  // A request has to exist, undecided, before the counter can answer it, so
  // this chapter raises its own even after the loop has run.
  const doctorPage = await doctorSignsIn(stage, story);
  await doctorRaisesRequest(stage, story, doctorPage);
  const page = await centreSignsIn(stage, story);

  await page.goto(`${APPS.centre.origin}/centre/stock`);
  await stage.say(page, 'The register: every unit on the shelf, oldest expiry first, and the floor for each group.');

  await centreDecides(stage, story, page);

  await page.goto(`${APPS.centre.origin}/centre/donations`);
  await stage.say(page, 'Donations: who is coming in and who has given, across every demand. No phone numbers here; those stay on the roster.');
};

/* -------------------------------------------------------------------------- */
/* The donor                                                                   */
/* -------------------------------------------------------------------------- */

async function donorRegisters(
  stage: Stage,
  name: string,
  who: { phone: string; name: string; group: string; sex: 'Female' | 'Male' | 'Other'; birthYear: string },
): Promise<ChatPage> {
  const page = await stage.window(name, 'phone', `${DONOR.origin}/chat`);
  const chat = new ChatPage(page);
  await stage.chapter(page, 'The donor app, :3004. A chat in the browser, no account, installable to the home screen.');
  await chat.begin();
  await stage.say(page, 'Open it, see what is needed now, and press Register: no sign-up form, a few questions, about a minute.');
  await stage.during(page, `${who.name} answers: phone, name, date of birth, sex, group ${who.group}, weight, four health questions, where they live, last donation.`, () =>
    chat.register({ ...who, group: who.group, ...PLACE }),
  );
  await stage.say(page, 'Every answered question is locked: the chosen button ticked, the rest inert. The summary was checked and agreed to.');
  await stage.say(page, `Registered. ${who.name} will be messaged when someone nearby needs ${who.group}.`);
  return chat;
}

export const donor: Chapter = async (stage, story) => {
  const chat = await donorRegisters(stage, 'donorA', {
    phone: '9847000201',
    name: `Anita Showcase ${story.stamp}`,
    group: 'B−',
    sex: 'Female',
    birthYear: '1994',
  });
  story.donorA = chat;
  const page = chat.page;

  await stage.during(page, '"What is needed now": the board, every hospital, filled dots for what this donor could give for.', () =>
    chat.tap('What is needed now'),
  );
  await stage.hold(page, stage.pace);

  await stage.during(page, '"I want to give": an offer, noted, with the one fact that is true for them.', () =>
    chat.tap('I want to give'),
  );
  await stage.hold(page, stage.pace);

  await stage.during(page, '"My details": the same summary as at sign-up, with the same three buttons.', () =>
    chat.tap('My details'),
  );
  await chat.waitForBubble(/Please check these details/);
  await stage.during(page, 'Nothing to change today.', () => chat.tap('Yes, this is correct'));

  await stage.during(page, '"Pause messages": ninety days of quiet, with the date it lifts.', () =>
    chat.tap('Pause messages'),
  );
  await chat.waitForBubble(/We will not ask again until/);
  await stage.hold(page, stage.pace);
  await stage.during(page, '"Start again": back in the pool.', () => chat.say('resume'));
  await chat.waitForBubble(/Welcome back/);

  await stage.during(page, '"delete": said plainly before it happens, and it asks first.', () =>
    chat.say('delete'),
  );
  await chat.waitForBubble(/Delete everything\?/);
  await stage.say(page, 'Donations already made stay with the centre without a name, because the law requires it. Everything else goes.');
  await stage.during(page, 'Deleted. The transcript went with it; this is the first line of a new one.', () =>
    chat.tap('Yes, delete everything'),
  );
  await chat.waitForBubble(/deleted/i);
  await stage.hold(page, stage.pace * 1.5);
  delete story.donorA;
};

/* -------------------------------------------------------------------------- */
/* The volunteer admin                                                         */
/* -------------------------------------------------------------------------- */

export const volunteer: Chapter = async (stage, story) => {
  const page = await staffWindow(stage, story, 'volunteer', {
    chapter: 'The volunteer app, :3003. Counts and hospitals, never a person.',
    signIn: 'A volunteer admin signs in.',
  });
  await page.goto(`${APPS.volunteer.origin}/volunteer`);
  await stage.say(page, 'Eight tiles, one per group: how hard each is being pushed right now. Colour, a word and a number, never colour alone.');

  const tile = page.getByRole('link', { name: /^B- / });
  await stage.during(page, 'Tap a tile for the demands behind it, and the message to paste into a community group.', () =>
    tile.click(),
  );
  await stage.hold(page, stage.pace * 1.5);
  await stage.say(page, 'The share message is generated from the live numbers. It names a hospital and a town, and no patient, doctor or donor.');

  await page.goto(`${APPS.volunteer.origin}/board`);
  await stage.say(page, 'The public board: the one page anybody can open or forward. Five columns, and no way to show a sixth.');
};

/* -------------------------------------------------------------------------- */
/* Administration                                                              */
/* -------------------------------------------------------------------------- */

export const admin: Chapter = async (stage, story) => {
  const page = await staffWindow(stage, story, 'admin', {
    chapter: 'Administration, :3001. Doctor records and the control panel. Nothing clinical.',
    signIn: 'The administrator signs in.',
  });
  await page.goto(`${APPS.admin.origin}/doctors`);
  await stage.say(page, 'Doctor records: invite, deactivate, and the account update queue. Administration never sees a patient or a donor.');

  await page.goto(`${APPS.admin.origin}/panel`);
  await stage.say(page, 'The control panel: every dependency checked by doing its job, and the two heartbeats. The donor bot publishes its own.');
  await expect(page.locator('li').filter({ hasText: 'Donor bot' })).toContainText(/Reporting|Silent/);

  await page.goto(`${APPS.admin.origin}/panel/trace`);
  if (story.requestNumber) {
    await stage.say(page, 'Follow one request end to end from its number, across both database roles.');
    await page.getByLabel('Identifier').fill(story.requestNumber);
    await stage.during(page, `${story.requestNumber}: every recorded step, oldest first. Ids and stages, never a name.`, () =>
      page.getByRole('button', { name: 'Follow it' }).click(),
    );
    await expect(page.getByRole('table')).toContainText('Request raised');
    await stage.hold(page, stage.pace * 2);
  } else {
    await stage.say(page, 'Follow one request end to end from its number. Run the loop chapter first to have one to follow.');
  }

  await page.goto(`${APPS.admin.origin}/panel/deployment`);
  await stage.say(page, 'The resolved configuration, read-only: the clinical thresholds the web app and the bot both read.');
};

/* -------------------------------------------------------------------------- */
/* The loop                                                                    */
/* -------------------------------------------------------------------------- */

export const loop: Chapter = async (stage, story) => {
  /* --- two donors are already registered ----------------------------- */
  story.donorA = await donorRegisters(stage, 'donorA', {
    phone: '9847000301',
    name: `Anita Showcase ${story.stamp}`,
    group: 'B−',
    sex: 'Female',
    birthYear: '1994',
  });
  story.donorB = await donorRegisters(stage, 'donorB', {
    phone: '9847000302',
    name: `Rahul Showcase ${story.stamp}`,
    group: 'O−',
    sex: 'Male',
    birthYear: '1990',
  });
  await stage.say(story.donorB.page, 'O− can be given to a B− patient, so both of these donors will be asked.');

  /* --- the request and the decision ----------------------------------- */
  const doctorPage = await doctorSignsIn(stage, story);
  await doctorRaisesRequest(stage, story, doctorPage);

  const centrePage = await centreSignsIn(stage, story);
  await centreDecides(stage, story, centrePage);

  /* --- recruitment ----------------------------------------------------- */
  const donorA = story.donorA;
  const donorB = story.donorB;
  await stage.focus('donorA');
  await stage.during(
    donorA.page,
    `The bot ticks every ${seconds(TICK_MS)}: it imports the demand and asks the nearest eligible donors first. Waiting for the card…`,
    () => donorA.waitForBubble(/needs B− blood/, TICKER_WAIT_MS),
  );
  await stage.say(donorA.page, 'The card: the hospital, the group, the day. Never the patient.');

  await stage.focus('donorB');
  await donorB.waitForBubble(/needs B− blood/, TICKER_WAIT_MS);
  await stage.say(donorB.page, 'The same card reached Rahul. Each person is asked once per request.');

  await stage.focus('donorA');
  await stage.during(donorA.page, 'Anita says yes, and answers four questions about today. None of these reach her profile.', () =>
    donorA.acceptAndScreen(),
  );
  await donorA.waitForBubble(/The centre is expecting you/);
  await stage.say(donorA.page, 'Confirmed. This is the moment her name and number reach the blood centre, and only the blood centre.', stage.pace * 1.5);

  /* --- the counter ----------------------------------------------------- */
  await stage.focus('centre');
  await centrePage.goto(story.rosterUrl ?? `${APPS.centre.origin}/centre/demands`);
  const card = centrePage
    .locator('section')
    .filter({ has: centrePage.getByRole('heading', { name: `Anita Showcase ${story.stamp}` }) })
    .last();
  await expect(card).toBeVisible({ timeout: TICKER_WAIT_MS });
  await stage.say(centrePage, 'Anita is expected at the counter: name, number, group, and the channel she was reached on.');
  await card.getByLabel('Outcome').selectOption('completed');
  await card.getByLabel('Unit number').fill(`SYN-SC-${story.stamp}`);
  await stage.during(centrePage, 'She gave. The counter records the unit number and the group it typed as.', () =>
    card.getByRole('button', { name: 'Record' }).click(),
  );
  const marked = centrePage
    .locator('section')
    .filter({ has: centrePage.getByRole('heading', { name: 'Already marked' }) })
    .last();
  await expect(marked).toContainText(`Anita Showcase ${story.stamp}`);

  await stage.focus('donorA');
  await stage.during(donorA.page, 'Waiting for the next tick to thank her…', () =>
    donorA.waitForBubble(/recorded your donation/, TICKER_WAIT_MS),
  );
  await stage.say(donorA.page, 'Thanked, with the date she can give again. She will not be asked before then.', stage.pace * 1.5);

  /* --- the ending ------------------------------------------------------ */
  await stage.focus('doctor');
  await doctorPage.goto(story.requestUrl ?? `${APPS.doctor.origin}/dashboard`);
  const cancel = doctorPage.getByRole('button', { name: 'Cancel this request' });
  if (await cancel.isVisible()) {
    await stage.say(doctorPage, 'The patient was referred. The doctor cancels; every donor still holding a place is stood down.');
    await cancel.click();
    await doctorPage.getByLabel('Why is it being cancelled?').fill('Showcase: patient referred');
    await doctorPage.getByRole('button', { name: 'Cancel the request' }).click();
    await expect(doctorPage.getByRole('status').filter({ hasText: /stood down/ })).toBeVisible();
  } else {
    await stage.say(doctorPage, 'The shelf had nothing to issue, so the answer was recorded as declined with the demand open. The centre withdraws it.');
    await stage.focus('centre');
    await centrePage.goto(`${APPS.centre.origin}/centre/demands`);
    const row = centrePage.getByRole('row').filter({ hasText: 'B−' }).filter({ hasText: 'Open' }).first();
    await row.getByRole('button', { name: 'Withdraw' }).click();
    await row.getByLabel('Why is this being withdrawn?').fill('Showcase: patient referred');
    await stage.during(centrePage, 'Withdrawn. Every donor holding a unit for this is told it has ended, in the same pass (§7.6).', () =>
      row.getByRole('button', { name: 'Withdraw the demand' }).click(),
    );
    await expect(centrePage.getByText(/Withdrawn/).first()).toBeVisible();
  }

  await stage.focus('donorB');
  await stage.during(donorB.page, 'Rahul had said nothing yet. Waiting for the stand-down…', () =>
    donorB.waitForBubble(/no longer needed/, TICKER_WAIT_MS),
  );
  await stage.say(donorB.page, 'Thanked first, then told not to travel. The message this system most has to get right (§7.6).', stage.pace * 2);

  /* --- what the rest of the hospital saw ------------------------------- */
  await volunteer(stage, story);
  await admin(stage, story);
};

export const CHAPTERS: Readonly<Record<string, Chapter>> = {
  loop,
  doctor,
  centre,
  donor,
  volunteer,
  admin,
};

/** `all` plays the loop, then each application's own flows. */
export const ALL: readonly string[] = ['loop', 'doctor', 'centre', 'donor', 'volunteer', 'admin'];
