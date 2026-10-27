# End-to-end user flows

Every flow a person can take through the system, in the order a tester should walk them, with what each step should show. Written against the build of [ADR 0018](adr/0018-what-a-public-deployment-needed.md), so it covers the worker, the counter's third outcome and the recruitment edges that were fixed there.

This is the flow-shaped companion to [qa-test-plan.md](qa-test-plan.md), which
is organised by module and goes deeper into the collision cases. Where the two
overlap, that document's check numbers are given in brackets so a failure can
be filed against one list.

Tick a box when a flow behaves as written. When it does not, note the step and
what you saw underneath it. Section references written as §n point at
[the specification](obdm-spec.md).

---

## 0. Setting up

Run these one at a time (PowerShell does not accept `&&`):

```
pnpm services:up
pnpm db:migrate
pnpm db:migrate:bot
pnpm db:seed
pnpm dev
```

`pnpm dev` starts six processes: the doctor app on :3000, administration on
:3001, the blood centre on :3002, volunteers and the public board on :3003, the
donor app on :3004, and the worker, which has no screen. Mail lands in Mailpit at
<http://localhost:8025>.

Every seeded account uses the password `OBDM!Demo2026`:

| Account | App |
|---|---|
| `doctor@obdm.invalid` | :3000 |
| `admin@obdm.invalid` | :3001 |
| `centre@obdm.invalid` | :3002 |
| `volunteer@obdm.invalid` | :3003 |

**Donors are devices.** The donor app has no sign-in; one browser profile is one
donor. Use a private window, a second browser or a phone for each additional
donor. Clearing cookies makes a stranger.

**The public board is off by default.** Flow 11 needs it on; the step there says
how.

**Time.** The bot ticks every fifteen seconds (`BOT_TICK_INTERVAL_MS`). Anything
that "arrives from the bot" can take up to that long plus the chat's six-second
poll. The worker drains email every fifteen seconds and runs its sweeps hourly;
the applications also send email straight after the action that queued it, so an
invite normally arrives at once.

**A fresh start.** `docker compose down -v`, then the five commands above.

---

## 1. Staff sign in, and only at their own application

Proves ADR 0016: four applications, one role each, nothing leaks between them.
[M0-13]

1. Open <http://localhost:3000/sign-in>. Sign in as `doctor@`.
   - Lands on **/dashboard**. The sidebar's account card shows the doctor's
     name and email address, not only "Doctor".
2. In the same browser open <http://localhost:3002/centre>.
   - The centre's sign-in page. The doctor's session means nothing here.
3. On that page, sign in with the doctor's email and password.
   - Refused with the same sentence as a wrong password. Nothing hints that the
     account exists somewhere else.
4. Sign in as `centre@` on :3002, `volunteer@` on :3003, `admin@` on :3001.
   - Each lands on its own home: /centre, /volunteer, /doctors.
5. Still signed in as the doctor, open <http://localhost:3000/admin>.
   - 403, a page that carries no data. View source to confirm.
6. Sign in with a wrong password five times inside fifteen minutes.
   - The fifth answer says you are locked out and for how many minutes. [M0-5]

- [ ] Flow 1 passes

---

## 2. The administrator adds a doctor, who activates by email

Proves §2.2 (no sign-up; every account is invited) and §2.4 (email is the
delivery mechanism). [M0-1, M0-2, M0-3]

1. As the administrator, **Doctors → Add a doctor**. Fill **Full name**,
   **Email address** (any address; Mailpit catches it), **Provisional
   registration number**. Press **Create and send invite**.
   - The doctor appears in the list, status pending, with how many days the
     invite has been waiting.
2. Open Mailpit. Open the invite email, follow its link.
   - It opens in the **doctor** app (:3000), not administration. The form asks
     for a password only.
3. Set a password of at least six characters. Press **Set password and sign in**.
   - Signed in, on /dashboard. No second sign-in form.
4. Open the same invite link again.
   - Refused, with a message to ask for a new one.
5. Back in administration, open the doctor and press the resend action.
   - A new invite arrives; the old link stays dead.

- [ ] Flow 2 passes

---

## 3. A doctor raises a request from four fields

Proves ADR 0010: the request slip. [M1-1 to M1-4]

1. As the doctor, **Requests → New** (<http://localhost:3000/requests/new>).
   - Four inputs visible: blood group, product, units, urgency. Everything else
     is behind a closed disclosure.
2. Choose **B−**, press **5+** and type **6** in **Units**, choose **Urgent,
   today**. Press **Send to the blood centre**.
   - A status box says to tell the bystander the request number, of the shape
     `DDMMYY-NNNNN` (today's date and a five-digit sequence). Note it down.
3. Open the request's page.
   - Status Submitted. The date required is today (urgent means today;
     routine would mean a week).
4. Raise a second request straight after.
   - Its number is the next in sequence, no gap, no repeat.

Edge: submit the form with units left empty.
   - Refused in place; the other fields keep their values.

- [ ] Flow 3 passes

---

## 4. The centre takes the patient and answers the request

Proves §4 and the decision transaction of §7.2. [M2-3 to M2-6]

1. As the centre, **Blood requests** (<http://localhost:3002/centre/requests>).
   - The queue lists the request by its number, most urgent first, with a
     **Waiting** column, the group's stock, and **Take details** on the row
     because there is no patient yet. A banner counts requests with no patient.
   - Leave the page open for a minute: a request raised on :3000 meanwhile
     appears on its own, without a reload, and your scroll position holds.
2. Open the request. The first card is **Who is this for?**
3. Fill **Patient name**, **IP number** (anything, e.g. `SYN-IP-E2E-1`),
   **Patient's own ABO group and RhD type** B−, **Age** 34. Press **Record the
   patient**.
   - "Patient recorded." The card at the top now carries the patient's name.
4. Read the **Answer this request** card.
   - It states how many units of that product and group are on the shelf. The
     seed holds fewer than six B− red cells, so the shortfall will recruit.
5. Press **Issue** (the button names what is on the shelf).
   - A box says "A donor demand for N units of B− was raised with this answer",
     linking to recruitment. The decision card shows "Partly approved, X of 6
     units", and the issued units, each held for this request.
6. Open the request page again, as the doctor.
   - Status Partly approved, with "Donors are being asked" for the rest.

Edges, each on a fresh request from flow 3:

- **Wrong IP number.** Record a patient with the IP number used in step 3 but a
  different name.
  - Refused: "That IP number is already on record for a different patient."
    Nothing changes. The same name typed with different capitals or spacing is
    accepted (same person, two requests).
- **Missing required field.** Submit the patient form without a group.
  - Refused; every field you typed is still filled, including anything inside
    the disclosure, which opens itself.
- **Issuing without a patient.** Open a new urgent request and press Issue
  before recording the patient.
  - Refused. Only an **emergency** may be answered first, and then the page
    shows the patient as outstanding until recorded. [M2-6]
- **Deciding twice.** Open the same decided request in two tabs; press Issue in
  both.
  - The second says the request was already decided. One decision exists.

- [ ] Flow 4 passes

---

## 5. A donor registers in the chat

Proves §5 (onboarding commits nothing until consent) and ADR 0017 (a donor is a
device). [M3-1 to M3-4]

1. In a fresh browser profile open <http://localhost:3004>.
   - The bot greets: "Hello, and thank you for coming", then asks for a phone
     number. Nothing was typed to start it.
2. Answer in turn: phone number (ten digits), name, year, month and day by
   tapping, sex, blood group **B−**, weight band **50–60**, **No** to each of the
   durable health questions, district **Kozhikode**, then a city, town and
   locality from the buttons or by typing the first letters when asked.
   - Every answered question locks: the chosen button ticked, the others inert.
     Nothing yet exists in the donor table (a database client as `migrator` can
     confirm: `select count(*) from bot.donors` does not move).
3. **Last donation**: tap **I have never donated**.
4. **Please check these details**: read the summary, tap **Yes, this is correct**.
   - "You are registered." Now the donor row exists, with consent recorded.
5. Reload the page.
   - The same transcript, same place. Close the browser and reopen: the same.
6. Type **help**.
   - A short menu of what you can say: needs, board, pause, stop, profile,
     delete.

Edges:

- Type a year of birth that makes the person 16.
  - Refused with the age rule; the question stays open.
- Choose weight **under 45**.
  - Registered, but told they will not be asked until the weight is above the
    minimum; this donor never receives a card.
- Mid-signup, type **stop**.
  - The draft is discarded; a later message starts afresh.

Register a **second donor** in another profile as **O−** (a group that can give
to a B− patient). Both donors should be in Kozhikode so they land in the first
wave.

- [ ] Flow 5 passes

---

## 6. Recruitment: the card, the questions, the confirmation

Proves §7.7 (waves by proximity) and §7.3 (the last unit). [M3-5 to M3-9]

Preconditions: flow 4's demand is open; two registered donors from flow 5.

1. Wait for the tick (up to fifteen seconds, then the six-second poll).
   - Both donors receive a card: "Someone at <hospital> needs B− blood by
     <date>", with **Yes, I can give** and **Not this time**.
   - The centre's **Demand** page shows the demand with donors **Notified: 2**.
2. Donor A taps **Yes, I can give**.
   - Four visit questions, one at a time: feeling well (**Yes**), eaten
     (**Yes**), antibiotics (**No**), surgery, tattoo or piercing (**No**).
   - Then: "The centre is expecting you", with the hospital's address and the
     day. The card's buttons are locked with **Yes, I can give** ticked.
3. As the centre, open the demand's **Roster**.
   - Donor A is under **Expected at the counter**: name, phone (marked "not
     verified", because the web cannot verify a number), group B−. The header's
     confirmed count reads 1.
4. Donor B taps **Not this time**.
   - "Thank you for telling us", and the card locks.

Edges:

- Donor answers **No** to feeling well.
  - Deferred for this request only: "not today", nothing recorded against the
    donor, and no roster row. They can answer the next request.
- Tap **Yes, I can give** twice quickly (or reload and tap again).
  - The second tap says "you have already answered this one"; the questionnaire
    does not restart.
- **A filled request.** Raise a request whose shortfall is **1 unit**. Let both
  donors receive the card. Donor A accepts and answers all four. Donor B then
  taps **Yes, I can give**.
  - Donor B is told at once: "Enough people have already said yes to this one,
    so you are on the waiting list", with **no** visit questions. The roster
    header reads 1 confirmed, 1 waiting. [M3-12]

- [ ] Flow 6 passes

---

## 7. At the counter: donated, no-show, cancelled, walk-in

Proves §4 (the centre is the authority on who gave blood), §5 ("Cancelled
releases the unit"), and the fixes of ADR 0018 §7. [M3-10, M3-11, M4]

On the roster from flow 6, donor A's card:

1. **Outcome: Donated**, type a **Unit number** (e.g. `SYN-E2E-1`), choose the
   group the unit typed as, press **Record**.
   - Donor A moves to **Already marked** with the unit number. The header's
     collected count rises **on this page load**, not later.
   - Within a tick donor A's chat says "The centre has recorded your donation"
     and "You can give again from <date>" (90 days for male, 120 for female or
     other). Their next card will not come before that date.
2. Set up the next two edges on a fresh 1-unit demand with donors A and B, A
   confirmed, B waitlisted (the last edge of flow 6).

   **No-show, somebody waiting.** Mark A **No-show**.
   - A's chat: "The centre recorded that you could not come. That is completely
     fine". Within a tick B's chat: "A place has opened up", and B appears under
     Expected at the counter. The demand stays full; no new cards go out.

3. Again fresh: 1 unit, A confirmed, nobody waiting (B declined).

   **No-show, nobody waiting.** Mark A **No-show**.
   - The demand reopens: within a tick a new card goes to the next eligible
     donor who has not been asked (register a third donor beforehand to see
     it). The demand does not sit "fulfilled" with a unit outstanding.

4. Again fresh: 1 unit, A confirmed, B waitlisted.

   **Cancelled.** A phoned to say they cannot come. Mark A **Cancelled**.
   - A's chat: "The centre recorded that you let them know you could not come.
     Thank you for telling them; your place has gone to the next person." B is
     promoted exactly as in the no-show case. (Before ADR 0018 this outcome was
     recorded and then ignored.)

5. **Walk-in.** On any open demand's roster, press **Record a walk-in**: name,
   phone, the group the unit typed as, unit number, **Record the donation**.
   - The demand's collected count includes it. If it completes the demand, the
     bot stops recruiting and stands everyone else down (flow 8). A donor
     already confirmed is still expected, not turned away.

6. Mark the same donor twice.
   - The second attempt is refused; each donor is marked once.

- [ ] Flow 7 passes

---

## 8. The endings: completed, withdrawn, expired

Proves §7.6, the stand-down guarantee, which §14 names as the thing most likely
to be left half-built. [M3-13 to M3-15]

1. **Completed.** On a demand with every unit given (flow 7 steps 1 or 5),
   wait a tick.
   - Every donor still holding a card or a place is told "You are no longer
     needed for that request. Enough people came forward", "Please do not
     travel for this one". The demand shows Completed on the centre's list.
2. **Withdrawn by the doctor.** On a partly approved request, as the doctor
   press **Cancel this request**, give a reason, press **Cancel the request**.
   - "Stood down" in the status box. Within a tick every donor on that demand
     reads "The hospital has withdrawn it", "do not travel". The reserved units
     return to the shelf; the demand shows Withdrawn.
3. **Withdrawn by the centre.** On the **Demand** page, a row's **Withdraw**,
   reason, **Withdraw the demand**.
   - The same messages. Pressing Withdraw again does nothing.
4. **Expired.** As `migrator`, date a demand in the past:
   `update hospital.donor_demand set date_required = current_date - 1 where id = '<id>'`
   - Within a tick: "It has passed the day the blood was needed", and the demand
     shows Expired.
5. **An overdue request.** Date a submitted request in the past the same way
   (`hospital.blood_requests.date_required`), then as the centre Issue it with a
   shortfall.
   - The demand raised is dated **today**, and donors are asked. (Before ADR
     0018 it was dated in the past and expired before anyone was asked.)
6. A donor taps **Yes, I can give** on a card for a demand that has since ended.
   - Told the request is closed; no questionnaire.

- [ ] Flow 8 passes

---

## 9. The floor, and recruiting for it

Proves §4 (stock floor) and §5.6 (one demand per short group). [M2-8, M2-9]

1. As the centre, **Overview**. Read the stock chart and the table under it.
   - Each group shows on the shelf, reserved, floor, short by, expiring soon.
     Red cells and whole blood only.
2. Press **Recruit for N groups below the floor**.
   - One demand per short group appears on the Demand page, trigger Stock floor,
     dated today. Pressing the button again recruits nobody twice ("already has
     an open floor demand").
3. Let the worker run, or wait for the top of the hour: bags past their expiry
   leave the shelf count and the decision page's "on the shelf" figure. To see
   it now, set a bag's `expires_at` to yesterday as `migrator` and restart the
   worker (`pnpm worker`); its terminal prints "N bags past their expiry marked
   expired".

- [ ] Flow 9 passes

---

## 10. The volunteer dashboard

Proves §6 and ADR 0013: the board sees pressure and no person. [M4-1 to M4-3]

1. As the volunteer, <http://localhost:3003/volunteer>.
   - One tile per group with an open demand, coloured by how much of what is
     asked for has somebody coming: "messaged", "confirmed" or "Covered".
   - No donor name, phone or patient detail anywhere. View source to confirm.
2. The volunteer account is scoped to Kozhikode. A demand from another district
   (none in the seed; set one's `district_id` as `migrator` to try) does not
   appear.
3. Open <http://localhost:3003/centre> or /doctors.
   - Sign-in page or 403, as in flow 1.

- [ ] Flow 10 passes

---

## 11. The public board

Proves §9.4: a public page that cannot reach a patient column.

1. Open <http://localhost:3003/board>.
   - Not found or "not published" while the flag is off.
2. Publish it, as `migrator`:
   `insert into hospital.app_config (key, value) values ('flag.public_board', 'true') on conflict (key) do update set value = excluded.value`
   (the cache takes up to a minute).
3. Open the board again, signed out, in a private window.
   - Open demands by group and district with how many units, and a link into
     the donor app (`/r/<public id>`). No hospital patient, no donor, no request
     number.
4. Follow a request link in a donor profile that is registered.
   - The chat opens straight onto that request's card. Reload: the link is not
     reopened (the address bar is back to `/`).
5. Follow one in a fresh profile.
   - Onboarding first (flow 5), then the request's card at the end: "the link
     is never lost".

- [ ] Flow 11 passes

---

## 12. Account self-service

Proves §3: resets by code, address changes by confirmation, updates by queue.
[M0-4, M0-7 to M0-12, M0-14]

1. Signed out of :3000, **Forgot your password**, enter the doctor's address.
   - Mailpit holds a six-digit code. The page shows both the code form and the
     new-password form.
2. Enter the code wrong five times.
   - Told to start the reset again. The code lasts ten minutes.
3. Start again, enter the code, set a password of six or more characters.
   - Signed in. Every other session for that account is ended: a second tab
     that was signed in is on the sign-in page after a reload.
4. **Profile → Change address** to a new email.
   - Mailpit: a confirmation to the **new** address and a warning to the **old**.
     The profile shows the change as pending with a cancel action. Following
     the link changes the address; cancelling keeps the old one.
5. **Profile → ask to change your name.** As the administrator, **Updates**:
   approve it.
   - The doctor's profile shows the new name without the administrator retyping
     it. A request for the administrator's own account shows no approve or
     reject buttons.
6. As the administrator, deactivate a doctor who is signed in elsewhere; reload
   that window.
   - Signed out at once, not at the next expiry.

- [ ] Flow 12 passes

---

## 13. The control panel

Proves §11.9 and ADR 0014: health by doing the job, alerts, the trace.
[M5-1 to M5-4]

1. As the administrator, <http://localhost:3001/panel>.
   - Tiles for database, email, storage and contract, each green with a
     measured latency and a "what to do". **Donor bot: Reporting**, with the
     age of its last heartbeat.
2. `docker compose stop mailpit`. Reload within a minute.
   - The email tile goes red with the driver's own error and what to do. Queue
     an invite (flow 2): it stays queued; after fifteen minutes an
     **Emails queued and not sent** alert appears. `docker compose start
     mailpit`: the worker sends it within fifteen seconds; the tile is green.
3. Stop the donor app (close its terminal, or `pnpm dev` without it).
   - After the heartbeat's grace, **Donor bot: silent**, with the backlog it
     left. Start it again: Reporting.
4. **/panel/trace**: type a request number from flow 3, **Follow it**.
   - Rows for Request raised, Centre decided, Demand raised, Donor confirmed,
     each with a time, in order. No donor's name appears.
5. **/panel/deployment**.
   - Every configuration key with its value and whether it is the default; the
     contract version compiled and stored; migrations applied.

- [ ] Flow 13 passes

---

## 14. The chat throttle

Proves ADR 0017 §8 and ADR 0018 §4: a public route that cannot be flooded.

1. In the donor app, send thirty-one messages inside a minute (a script is
   easiest; from a terminal, with the cookie jar the browser holds, or simply
   paste and send "hello" quickly).
   - The thirty-first is refused: the chat shows "That was quick. Give it a
     moment, then try again", and the text you typed is back in the box, not
     lost. The server answered 429 with `Retry-After` (the browser's network
     tab shows it).
2. Wait for the minute to turn.
   - Sending works again. Nothing you sent while refused appears twice.

From a terminal, without a cookie:

```
for i in $(seq 1 35); do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3004/api/chat -H "origin: http://localhost:3004" -H "content-type: application/json" -d '{"kind":"open"}'; done
```
   - Every call is 200: with no cookie each request is a new device, and with
     no proxy in front there is no address to count. Behind the deployment's
     proxy the address is counted (900 a minute) and the loop would see 429.

- [ ] Flow 14 passes

---

## 15. The worker

Proves §11.1 and ADR 0018 §1: the jobs run, once, and nothing is lost when the
worker is not running.

1. With `pnpm dev` running, start a second worker: `pnpm worker`.
   - Its terminal says "another worker holds the lock; standing by". Stop the
     first (Ctrl-C in its terminal, or stop `pnpm dev`): within fifteen seconds
     the second prints "worker started" and takes over.
2. Stop every worker. Queue an invite (flow 2) with Mailpit stopped, then start
   Mailpit, and nothing else, and wait.
   - The invite stays queued: the application's own send attempt failed and
     there is no worker to retry. Start the worker: "drain-email-outbox: 1
     sent" within fifteen seconds, and the mail is in Mailpit.
3. Read the worker's terminal after an hour, or restart it.
   - "sweep-credentials: N sessions, N reset codes, ..." when there was
     something past its day of grace, and nothing when there was not. Nobody
     signed in is signed out by it.

- [ ] Flow 15 passes

---

## 16. A production start, and a real database

Proves §13 and ADR 0018 §2 and §3: a process refuses to run unconfigured, and a
database comes up without the seed. Needs Docker.

1. Build one image: `docker build -f deploy/Dockerfile.web --build-arg APP=admin -t obdm/admin .`
2. `docker run --rm obdm/admin`
   - Exits at once: "Refusing to start: the environment is not configured for
     production", one line per variable, no values printed.
3. Run it configured, pointing at the local database (`host.docker.internal:5433`
   as `migrator`, so the development password rule does not refuse it), with
   any non-default values for storage, mail and the four `https://` origins,
   and `-p 3101:3000`.
   - `curl -i localhost:3101/api/health` is `200 {"status":"ok"}` with the
     security headers; `/sign-in` renders.
4. A fresh database (`docker compose down -v`, `pnpm services:up`, both migrates) and
   then, instead of the seed:
   `BOOTSTRAP_ADMIN_EMAIL=you@example.org BOOTSTRAP_ADMIN_NAME="Your Name" BOOTSTRAP_ADMIN_PASSWORD=<twelve or more> pnpm db:bootstrap`
   - Locations, centre settings and the contract version are written and one
     administrator created; the password is never printed. Sign in at :3001
     with it. Run the command again: "1 administrator account(s) exist; nothing
     changed". Run it against the seeded database: refused, naming the seeded
     accounts.
5. `pnpm dev` against that bootstrapped database.
   - Every process starts. The doctor list is empty until the administrator
     invites someone (flow 2); the stock list is empty until the centre
     registers a bag.

- [ ] Flow 16 passes

---

## What a pass means

All sixteen flows passing on one machine is the system working end to end on
synthetic data, which is what the build was made to show. It is not a sign-off
for real records: that list is in [deployment.md §8](deployment.md#8-before-a-real-record-goes-in),
and none of it is a test.
