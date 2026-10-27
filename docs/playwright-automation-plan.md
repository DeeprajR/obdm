# Playwright automation plan

How the whole system is used, as browser tests: a doctor raises a request, the blood
centre answers it from the shelf, the donor app recruits a donor, the counter records
the donation, and everyone is told how it ended. Five applications, one loop, and the
endings the specification says must never be missed (§8, §14).

This is a plan, not a suite. The suite lands in `e2e/` at the workspace root, and
`@playwright/test` is already a workspace dev dependency.

Section references written as §n point at [the specification](obdm-spec.md).

---

## 1. What the suite is for

Three things, in order of importance:

1. **Prove the loop in §1 closes through the real screens.** The unit and integration
   suites prove it against Postgres. Nothing yet proves it through five browsers, five
   cookies and the ticker, which is the thing a demo audience watches.
2. **Catch the failures the specification names.** A demand closed without its stand-
   downs sent (§7.6). A 403 that carries data (§14). A page added without a guard
   (§13). A cached page served to the next person on a shared device (ADR 0004).
3. **Be the walkthrough.** With `--headed` and a slow motion setting, the journey spec
   is the demo script in [demo-plan.md](demo-plan.md) §5, run by a machine. A recording
   of it is the fallback the demo plan asks for.

Out of scope: load, the hardware phases (P11, P12), and anything that needs a real
email provider or chat platform. There is no chat platform any more (ADR 0017).

## 2. The environment the tests run against

| Piece | How the suite gets it |
|---|---|
| Postgres, Mailpit, MinIO | `docker compose up -d`, as today. CI already does this for the Vitest suite |
| Schema and seed | `pnpm db:migrate`, `pnpm db:migrate:bot`, `pnpm db:seed`. The seed is idempotent, so a run starts from the stocked, populated state the README describes |
| The five applications | Production builds, started by Playwright's `webServer` array: `next start` on :3000 to :3004. Production, not `next dev`, because the service worker only registers in production and because a dev server's first compile makes timeouts lie |
| The ticker | Runs inside the donor app. `BOT_TICK_INTERVAL_MS=2000` for the suite, so a wave arrives within a couple of seconds rather than fifteen |
| The public board flag | `flag.public_board` set to `true` in `hospital.app_config` by a global setup step, through `psql`, exactly as demo-plan §3.4 does by hand |
| Email | Read out of Mailpit's REST API (`http://localhost:8025/api/v1/messages`). The invite and reset flows need the link or the code from the message body |

One `.env` at the workspace root, as for everything else. The suite sets nothing a
developer's `.env` does not already have, except the tick interval.

**Global setup** (`e2e/global-setup.ts`): wait for all five `/api/health` routes to
answer `ok`; set the board flag; clear `bot.message_outbox` rows left pending for the
in-memory channel so the control panel starts green; sign in once per staff role and
save each `storageState` to `e2e/.auth/<role>.json`.

**Global teardown**: nothing destructive. The data the run created is synthetic and
prefixed, and a rerun of the seed leaves it alone. A nightly job may truncate.

## 3. Layout

```
e2e/
  playwright.config.ts
  global-setup.ts
  fixtures/
    apps.ts          baseURLs and ports for the five applications
    roles.ts         signIn(role) helpers and the four storageState paths
    donor.ts         a fresh browser context per donor: no storageState, its own bc_donor_chat cookie
    mailpit.ts       latest message to an address, link and code extraction
    db.ts            the few reads the tests need to assert on (psql over the migrator URL)
    chat.ts          page object for the donor chat: lastBubble(), tap(label), say(text), waitForBubble(text)
  specs/
    01-staff-sign-in.spec.ts
    02-doctor-request.spec.ts
    03-centre-decision.spec.ts
    04-donor-registration.spec.ts
    05-the-loop.spec.ts            the journey, end to end
    06-cancel-and-stand-down.spec.ts
    07-donor-self-service.spec.ts
    08-volunteer-and-board.spec.ts
    09-admin-and-panel.spec.ts
    10-accounts.spec.ts            invite, reset, address change, wrong-app refusal
    11-pwa.spec.ts
    12-access.spec.ts              the role matrix through the browser
```

**Projects** in `playwright.config.ts`: one per application for the per-app specs, each
with its own `baseURL`, plus a `journey` project with no `baseURL` that opens pages on
every origin by absolute URL. Chromium only to start; add WebKit for the donor app,
because that is the browser the donor's phone most likely has, and mobile emulation
(`devices['Pixel 7']`) for every donor-app spec.

**Isolation.** Every donor is a new browser context. The donor app knows a person by
the `bc_donor_chat` cookie, so a new context is a new donor with an empty transcript
and no setup beyond opening the page (ADR 0017 §3). Staff sessions come from the saved
storage states and are shared read-only across tests.

**Data.** Every request a test raises is for a group and a locality chosen to be
answerable by the donor the same test registers, and the test asserts on the request
number it was handed rather than on "the newest request". Two tests never contend for
the same demand; where they must share a screen (the queue, the roster), each asserts
on its own row.

## 4. The journey spec, step by step

`05-the-loop.spec.ts` is the demo in §5 of the demo plan. One test, serial steps, each
step a `test.step` so the report reads as the story. Expected run time under two
minutes with the fast tick.

| Step | Where | Does | Asserts |
|---|---|---|---|
| 1 | Donor app, fresh context A | Open `/`. Walk the interview: phone `9847000001`, name, DOB by three taps, Female, **B-**, 50–60, No to each health question, Kozhikode › the hospital's own city, town and locality, never donated. Tap **Yes, this is correct** | "Thank you, …. You are registered." Each answered question's buttons locked: the chosen one ticked, the rest disabled |
| 2 | Donor app, fresh context B | The same with **O-**, as the second donor | Registered |
| 3 | Doctor app, doctor state | New request: **B-**, PRBC, 2 units, urgent. Submit | A request number of the read-aloud shape `DDMMYY-NNNNN`. Keep it |
| 4 | Centre app, centre state | Open the queue, find that number, take patient details from the bystander, decide. The shelf for B- is short by design (demo plan §3.2) | The decision page shows units issued and "demand raised for N" |
| 5 | Centre app | Open **Demand** | The demand row appears, "Notified" moves from "not picked up" to a count within 10 s (`expect.poll`) |
| 6 | Donor app, context A | Wait for the request card (`waitForBubble(/needs B− blood/)`) | Card with **Yes, I can give** and **Not this time** |
| 7 | Donor app, context B | The same card arrives for the O- donor | Card present |
| 8 | Donor app, context A | Tap **Yes, I can give**. Answer the four visit questions **Yes, Yes, No, No** | "Thank you. The centre is expecting you." with the hospital address. The card's buttons locked |
| 9 | Centre app | Open the demand's roster | Donor A's name and masked number, group B-, channel "Donor app", phone "not verified" |
| 10 | Centre app | Mark donor A **Donated**, bag identifier typed, group B- | Row shows Donated |
| 11 | Donor app, context A | Wait | "Thank you. The centre has recorded your donation." with a next-eligible date 120 days on (Female) |
| 12 | Donor app, context B | Wait, after the demand completes | "You are no longer needed for that request." then "Enough people came forward…". Card buttons locked |
| 13 | Volunteer app, volunteer state | Open the dashboard | The B- tile moved through "Nobody yet" to "Covered"; the share message names the hospital and no person |
| 14 | Admin app, admin state | Open the control panel, then the trace screen with the request's correlation id | Bot heartbeat **Reporting**; the trace lists the request, the demand, the import, the wave, the confirmation and the donation in order; no name on the trace |

The bystander-at-the-counter detail entry in step 4 follows
[blood-centre-guide.md](user-guides/blood-centre-guide.md); the exact field list is in
[input-fields.md](input-fields.md), which is the source for every form's selectors.

## 5. The other specs

**01 Staff sign-in.** Each seeded account signs in to its own app and lands where the
README's table says. Each is refused at the other three with "Email or password is
incorrect" and no other difference, timing aside (ADR 0016 §2). Sign-out clears only
that app's cookie: a tab on another app stays signed in.

**02 Doctor request.** The slip: four fields and an id (ADR 0010). Validation on each
field. Cancel from the request view with the reason the form asks for. The patients
view is audited by record, so opening it writes an audit row (asserted through `db.ts`).

**03 Centre decision.** The queue, the decision, a shortfall raising demand in the same
screen. The register: a tag that already exists is three situations and three
different screens (README P6). Stock floor: "Recruit for groups below floor" raises
once and refuses a second time.

**04 Donor registration.** Every branch of the interview the donor guide documents:
under 18 refused and the question stays; two bad phone numbers and the second refusal
shows an example; `help` mid-interview re-asks the question; `stop` discards and says
nothing was saved; **Fix something** with two rows ticked re-asks exactly those two and
returns to the summary; **Not now** registers dormant and `resume` wakes them;
abandoned draft reminded once after six hours (`db.ts` moves `conversation_state.
updated_at` back, the next tick sends the reminder, and a second tick does not).

**06 Cancel and stand-down.** The test the specification cares most about. Donor A
confirms as in the journey. The doctor cancels the request. Within two ticks donor A
reads "Thank you. You are no longer needed for that request. The hospital has
withdrawn it." and the centre's demand row reads cancelled. Then the negative: with the
donor app stopped (the `webServer` for :3004 is not part of this project), cancel a
second request and assert the control panel shows "Messages queued to donors and not
sent" rising, which is §11.9's alert doing its job. Restart the app and assert it
clears.

**07 Donor self-service.** `needs` with nothing open and with something open, the
filled and hollow dots, the Give button leading to the same card as a wave. `donate`
notes interest. `pause` names the date, `resume` undoes it. `delete` asks first, then
confirms what went and what stayed; afterwards the context is a stranger again and the
transcript starts fresh with the confirmation as its first line (ADR 0017 §6). A
request link `/r/<id>` opened by a fresh context onboards first and returns to the
request; opened by a registered context shows the card at once; a stale id shows
"That request has already been answered" and the board.

**08 Volunteer and board.** The eight tiles and their words, the demands behind a tile,
the generated share message with the board URL, and the public board with no account:
five columns and no sixth, no link to the donor app (its guide says so), "not
published" when the flag is off.

**09 Admin and panel.** Doctor records: add, invite email in Mailpit, deactivate. The
panel: every tile Working; stop the MinIO container and the storage tile goes red
within a refresh (the integration suite already does this, so here it is one case,
not a matrix). The deployment view is read-only.

**10 Accounts.** Invite link once and expired; reset with the six-digit code from
Mailpit, which signs out everywhere else; address change confirmed from the new inbox;
the update-request queue (ADR 0012). Reset finished in the wrong app sends the person
to their own app's sign-in.

**11 PWA.** For each of the five apps: the manifest is served with the right name and
icons; a production page registers `sw.js`; with `context.setOffline(true)` a
navigation shows the offline page and **no data**; back online, a reload shows live
data. On the donor app, offline shows "nothing you said is lost" and reconnecting
shows the same transcript.

**12 Access.** §9's role matrix, transcribed again but through the browser: for each
(role, path) pair, the status code and that a 403 body contains none of a set of
sentinel strings (a patient name, a donor name, a request number). This duplicates the
unit test on purpose; the unit test proves the function, this proves the deployment.

## 6. Page objects worth writing once

- **`ChatPage`** (donor app): `open(path = '/')`, `say(text)`, `tap(label)` which
  finds the most recent live button with that label, `lastBubble()`, `waitForBubble(
  matcher, timeout)` which polls because messages arrive from the ticker, and
  `lockedChoices(bubble)` returning `{ chosen, unavailable }`.
- **`SignIn`** per staff app, used only by global setup.
- **`Queue`, `Roster`, `Register`** for the centre; **`RequestSlip`** for the doctor;
  **`Tiles`** for the volunteer; **`Panel`, `Trace`** for admin.
- **`Mailpit`**: `latestTo(address)`, `linkIn(message)`, `codeIn(message)`.

Selectors: roles and accessible names first (`getByRole('button', { name: 'Yes, I can
give' })`), labels for inputs, `data-testid` only where a table cell has no name of its
own. The kit's components render labels and roles already, which is what makes this
viable without a testid on every element.

## 7. Timing rules

- Anything that depends on the ticker uses `expect.poll` or `waitForBubble` with a
  timeout of three ticks, never a fixed sleep.
- The donor app's own refresh is six seconds while visible; the page object calls
  `page.reload()` only where a test is about the reload itself, and otherwise waits for
  the poll.
- Every step that waits says why in its name, so a timeout in the report reads as
  "waited for the request card" and not as a bare number.

## 8. CI

A second job after `verify`, on the same Postgres service, Mailpit and MinIO:

```
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test --project=journey --project=donor --project=staff
```

Trace and video on first retry only; one retry in CI, none locally. The HTML report is
an artifact. The journey project runs alone first, serially, because it is the one
the rest exist to protect; the per-app projects run in parallel after it.

Nightly, the full matrix including WebKit for the donor app, and the stand-down
negative in spec 06, which stops and starts a server and is too slow for every push.

## 9. Order of work

| Phase | Builds | Done when | Status |
|---|---|---|---|
| A | `playwright.config.ts`, global setup, `apps.ts`, `roles.ts`, spec 01 | Four roles sign in and are refused elsewhere | **Done.** 9 tests, 13 s against `pnpm dev` |
| B | `ChatPage` (`fixtures/chat.ts`) with the full interview walk | A donor registers through the chat | **Done** as far as the journey needs; spec 04's branches remain |
| C | The doctor, centre and roster steps | A request becomes a demand on screen | **Done** inside the journey; the standalone page objects and specs 02, 03 remain |
| D | spec 05, the journey | The loop closes in a browser, under two minutes, recorded | **Done.** 56 s against `pnpm dev` with 15 s ticks |
| E | spec 06 | The stand-down is proven, and its absence is seen on the panel | Open |
| F | specs 07 to 12 | The rest of the matrix | Open |

Phase D was the milestone and is reached. What exists lives in `e2e/`, a workspace
package. With `pnpm dev` running in another terminal:

```
pnpm e2e                      # staff sign-ins and the journey, headless
pnpm e2e:show                 # the journey, headed: six windows, every step visible
pnpm e2e:report               # the HTML report, every step named

$env:E2E_SLOWMO = '600'       # PowerShell: slow every action to a watchable pace
$env:E2E_VIDEO = 'on'         # keep one recording per window under e2e/test-results/
pnpm e2e:show
```

On a POSIX shell the two variables go in front of the command instead:
`E2E_SLOWMO=600 E2E_VIDEO=on pnpm e2e:show`. The package's own script is named
`journey:headed`, not `show`, because `show` is one of pnpm's own commands and a script
by that name is shadowed by it, the same reason the root script is `bootstrap` and not
`setup`.

### The showcase

The journey is a test, and watching it run looks like one: six windows at once, each
blank until its first page, actions jumping between them with nothing said. For an
audience there is a separate project, `e2e/showcase/`, that runs on the same runner
and the same fixtures but is shaped as a demonstration:

- **One window per role, brought to the front in turn.** Created on first use and
  navigated at once, so no blank tab waits on the screen. Sign-ins happen on screen.
- **A caption on the page for every step**, in the demo plan's and the guides' words,
  injected so it survives navigation. The same line goes to the terminal with a time.
- **Pacing.** Slow motion on every action and a pause after every caption, both set by
  `SHOWCASE_SPEED` (`slow`, `normal`, `fast`). Waits on the ticker are narrated.
- **Chapters.** `loop` is the whole story; `doctor`, `centre`, `donor`, `volunteer` and
  `admin` are each application's own flows, playable alone or together. A chapter that
  needs something another makes, a request to decide or to trace, makes it itself.

```
pnpm showcase                         # the loop
$env:SHOWCASE = 'donor'; pnpm showcase
$env:SHOWCASE = 'all';   pnpm showcase    # the loop, then every application
$env:SHOWCASE_SPEED = 'slow'              # or 'fast' for a quick check
$env:E2E_VIDEO = 'on'                     # one recording per window
```

At `normal` pace the loop takes about three minutes with 15 s ticks, `all` about eight.
`pnpm e2e` does not run it; it is never part of CI.

`mailpit.ts` and `db.ts` beyond the two setup writes come with phases E and F.

## 10. Risks and what to do about them

- **Wave selection depends on geography.** A donor registered in the wrong locality is
  in wave two, thirty minutes later. The journey registers its donors in the hospital's
  own locality, read from the centre's settings, and the fast tick does not change
  wave spacing. If the spacing becomes a problem, set `wave.interval_minutes` low in
  `app_config` in global setup, the same way the board flag is set.
- **The seeded pool answers too.** 123 seeded donors on the in-memory channel share the
  waves. They cannot confirm, so they do not take the unit, but "Notified" counts them.
  Assert "Notified" is at least one rather than exactly two.
- **A donor is a browser context.** Closing the context loses the donor. Tests that
  need a donor across steps keep the context open for the whole test, and the journey
  is one test for that reason.
- **The production build is slow to start.** `webServer` gets a generous timeout and
  `reuseExistingServer` locally, so a developer with `pnpm dev` running can point the
  suite at it with `E2E_REUSE=1`, accepting that the service worker tests then skip.
- **Flaky by clock.** Dates on screen depend on the day the suite runs. Assertions use
  relative checks ("120 days from today" computed in the test) and never a literal date.
- **The shelf runs down.** Every run of the journey issues whatever B− the shelf holds.
  Once it holds none, the centre's answer is recorded as declined with the demand still
  open, and a declined request is not one the doctor can cancel. The journey therefore
  has two endings and takes whichever door is open: the doctor cancels the request, or
  the centre withdraws the demand. Both stand donor B down with "The hospital has
  withdrawn it." Re-seed (`pnpm db:seed`) to put units back and see the doctor's door.
  Found by running the journey six times in an hour, which is also the argument for
  the suite having its own database in CI.
- **Debris from a failed run.** A journey that fails before its last step leaves a
  demand open, and that demand keeps waving at every new donor, including the next
  run's. The waves are thirty minutes apart, so two runs rarely collide, and the
  demand list is newest first, so the test always picks its own. A nightly job should
  still withdraw anything older than a day.
