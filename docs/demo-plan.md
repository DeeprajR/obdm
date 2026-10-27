# Hospital demo plan

A plan for showing OBDM to the hospital: what to show, in what order, what to
say, and what to prepare so the live run works first time.

The demo tells one story: a patient needs blood, the shelf is short, a donor is found,
and the unit is traceable end to end. Everything else is shown as a side screen after
that story lands.

---

## 1. Who is in the room, and what they care about

| Person | What they want to see |
|---|---|
| Medical superintendent | That it is safe, does not make clinical decisions, and does not leak patient or donor data |
| Blood centre in-charge | That it makes the counter faster, not slower, and that the register cannot be fooled |
| Ward doctors | That raising a request takes under a minute |
| Transfusion committee or quality lead | Traceability: one unit, one named patient, every step on record |
| Hospital IT | What runs where, what happens when the network or the chat platform is down |

Open with the safety framing before the first click. Say it once, plainly: "This is not
a medical device. It never picks a substitute blood group, never decides if a donor can
give, and never shows a patient to a donor or a donor to an administrator. People make
those decisions. The system records them."

---

## 2. Format and timing

Total: about 45 minutes. Keep the live loop under 25.

| Minutes | Part |
|---|---|
| 0 to 5 | The problem today and the four roles. One slide or a whiteboard, no screen yet |
| 5 to 30 | The live loop, section 5 below |
| 30 to 38 | Safety screens, section 6 |
| 38 to 45 | Questions. Section 8 has the likely ones |

**Screens.** One laptop on the projector. Every app has its own cookie, so one browser
with four tabs works for all four staff roles. You do not need incognito windows. Keep
the tabs in this order: Doctor, Blood centre, Volunteer, Administration.

**Phone.** Your phone, with the donor app installed from http://localhost:3004 (or the
machine's address on the demo network) and registered, mirrored to the projector if
you can. If mirroring is not possible, hold it up and read the messages aloud. Ask a
colleague to bring a second registered phone so the "stand down" message can be seen.
A second browser profile on the laptop works as a second donor too: the donor app
knows a person by the browser's cookie.

---

## 3. Preparation, the day before

Do all of this the day before, then rehearse the loop once from start to finish.

### 3.1 Start the stack

```
pnpm services:up
pnpm dev
```

Docker Desktop does not start on its own on this machine. Launch it first. Check
`docker compose ps -a` shows postgres, mailpit and storage as Up. `pnpm dev` starts all
five applications; the donor app on :3004 is the bot, and its ticker starts with it.

### 3.2 Check the seed data is what you expect

The current database has this shape. It is a good demo state, so do not re-seed unless
something is broken.

| Item | State |
|---|---|
| Centre settings | Hospital name, address and district (Kozhikode) are set. Floor 25 |
| Stock | B- has 3 units on the shelf. A- has 4. AB- has 0. Everything else is higher |
| Donors | 123 seeded, all on the in-memory channel. They never receive a message in the donor app |
| Open demands | None. Every old demand is expired or cancelled |

**Use B- for the story.** It is short on the shelf, and only 10 seeded donors have a
group that can be given to a B- patient, so your phone is guaranteed to be in the
first wave of 20.

### 3.3 Register the demo phones with the donor app

On your phone, open the donor app (http://localhost:3004, or the laptop's address on
the demo network), add it to the home screen, and register:

- Type your number carefully; the roster will show it as not verified, which is the
  honest reading for a number typed into a web page, and the counter confirms it
- Blood group **B-**
- Location in Kozhikode district, ideally the hospital's own locality
- Weight 50 or more, all health answers No, never donated

Register the colleague's phone the same way with **O-**. That group is compatible with
B-, so both phones are asked, and the second one can be shown being stood down.

Type `needs` on both phones afterwards to check they are registered and see the empty
board.

### 3.4 Turn the public board on

The board is behind a feature flag with no button in any app. Run this once against the
Docker Postgres on port 5433:

```
docker exec -it obdm-postgres-1 psql -U postgres -d obdm
```

```sql
INSERT INTO hospital.app_config (key, value) VALUES ('flag.public_board', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

Then open http://localhost:3003/board. It should say "Nothing is outstanding right
now."

### 3.5 Clear the bot's backlog

The bot's outbox may hold pending messages left from earlier runs. With the donor app
running, check the administration control panel. If the row "Messages queued to donors
and not sent" is still there after a few minutes, those are messages to seeded
in-memory donors, which the donor app does not deliver (it runs the web channel only).
Either run against a clean database, or clear the pending rows:

```sql
DELETE FROM bot.message_outbox WHERE status = 'pending';
```

Do this only on the demo machine. It exists so the panel is green on the day and so
your own message is not behind two hundred others.

### 3.6 Check the control panel

Sign in to http://localhost:3001 as `admin@obdm.invalid` and open **Control
panel**. Before you go home:

- Database, SMTP, storage and contract tiles all say **Working**
- Web release and Donor bot both say **Reporting**
- "What is waiting on somebody" says nothing is waiting

If the bot says **Silent**, the donor app is not running or its ticker has stopped. Read
its lines in the `pnpm dev` terminal.

### 3.7 Rehearse once, end to end

Run section 5 from start to finish with a real B- request. Then cancel nothing and
leave the demand closed. Afterwards, B- will have fewer units on the shelf, which is
fine. Note the request ID you used so you can show it on the trace screen if the live
run fails.

**Record the phone screen during the rehearsal.** If the phone cannot reach the laptop
on the day, you play the recording at the moment the message should appear and continue
the rest live, or open the donor app in a second browser window on the laptop itself.
The centre roster, volunteer tiles and admin trace do not depend on the phone.

---

## 4. The morning of the demo

- [ ] Docker Desktop running, `docker compose ps -a` shows all three services Up
- [ ] `pnpm dev` running, all five apps answer at their ports, the donor app's terminal
      lines show "bot ticking" and no errors
- [ ] Control panel: all tiles Working, both heartbeats Reporting, nothing waiting
- [ ] Four browser tabs signed in: doctor, centre, volunteer, admin
- [ ] Both phones charged, the donor app open, **What is needed now** shows nothing open
- [ ] Mailpit at http://localhost:8025 open in a fifth tab, for the invite email
- [ ] Phone recording from the rehearsal on the laptop, ready to play
- [ ] Laptop on mains power, notifications and screen lock off
- [ ] The password `OBDM!Demo2026` on a card in your pocket

---

## 5. The live loop, step by step

Each step says which screen, what to do, and what to say. Say less than this if the
room is following.

### Step 1. The doctor raises a request (Doctor tab, 2 minutes)

Sign in as `doctor@obdm.invalid`. Press **New request**.

Choose **B-**, **Packed Red Blood Cells**, **5** units, **Urgent, today**. Press **Send
to the blood centre**.

Say: "Four answers. No patient details, no address, no form. The doctor is handling
several patients and is the wrong person to be typing a ward number."

The page shows the ID. Read it out: "The doctor gives this ID to the patient's
bystander. That is the whole handover. The bystander walks to the counter."

Point at the urgency line: "The system set the date and the answer target. Urgent means
the centre is asked to answer within 4 hours."

### Step 2. The bystander arrives at the counter (Centre tab, 3 minutes)

Sign in as `centre@obdm.invalid`. The dashboard button says **Answer 1
waiting**. Press it.

Show the queue: "Most urgent first. This one has no patient yet, so the button says
Take details."

Open it. Fill in **Who is this for?** with a made-up name, an IP number, B- as the
patient's own group, and an age. Press **Record the patient**.

Say: "A unit that leaves the fridge has to be traceable to a named person. The system
will not answer a request without one. The single exception is an emergency, which can
be issued first and completed after."

### Step 3. The centre answers from the shelf (Centre tab, 2 minutes)

Point at the **Answer this request** card. It says "3 of 5 units are on the shelf. The
remaining 2 will raise a donor demand in the same transaction."

Say: "Nobody typed that number. The register knows what is on the shelf, and it picks
the three units closest to expiry, exact group, exact product. It never substitutes a
compatible group. That is a clinical decision."

Press **Issue what is on the shelf**.

Show the result: three units listed with their expiry dates, the decision "Partly
approved", and the link to the recruitment. Say: "Issuing the units and asking for
donors happened in one step. There is no state where the units are out and nobody has
been asked."

### Step 4. The bot asks donors (Phone, 2 minutes)

The bot checks for new demands every 15 seconds. Within that time both phones receive:

> Someone at Government Medical College Blood Centre needs B- blood by [date].
> Could you give?

Say while waiting: "The bot asks the nearest people first, twenty at a time, and asks
the next twenty every thirty minutes until the units are covered. It asks people whose
group can be given to this patient, so the O- phone is asked too. It does not say who
the patient is."

Show the Centre tab's **Open demands** page meanwhile: the demand row, "Notified 2".

### Step 5. A donor says yes (Phone, 3 minutes)

On your phone tap **Yes, I can give**. Answer the four questions: feeling well, eaten,
no antibiotics, no surgery or tattoo.

Say: "Four questions about today. They are not stored on the profile. A wrong answer
gets a polite 'not this one', not a rejection."

The phone shows "Thank you. The centre is expecting you." with the address.

Say: "This is the first moment the hospital sees this donor's name and number. Not
before."

Have the colleague tap **Yes** on the O- phone too, and answer the questions. That
phone is also confirmed, because two units are needed. If you want to show the waiting
list instead, ask for 4 units in step 1 so only one unit is short.

### Step 6. The counter sees who is coming (Centre tab, 1 minute)

Open **Open demands**, then **Donors** on the row. Both donors appear under **Expected
at the counter** with name, phone and group.

Say: "This is the only screen in the system with a donor's phone number on it, and it
is the desk that has to ring them."

### Step 7. The volunteer and the public see the need (Volunteer tab, 2 minutes)

Sign in as `volunteer@obdm.invalid`. The B- tile shows the outstanding units
and its state. Tap it. Show the table and the **Message to forward**. Press **Copy the
message** and paste it into a notes app or a chat window.

Say: "The volunteer cannot edit this message. It is written from the live numbers, so
it can never go out wrong or stale. It names the hospital and the group. It never names
a patient or a donor."

Open http://localhost:3003/board in a new tab. Say: "This is the page the message links
to. Anyone can open it. Group, hospital, town, units, date. Nothing else."

### Step 8. The donor gives blood (Centre tab and phone, 2 minutes)

Back on the roster. For your own name, choose **Donated**, type a unit number such as
`DEMO-0001`, choose **B-** as the typed group, and press **Record**.

Your phone shows: "Thank you. The centre has recorded your donation. You can give again
from [date], and we will not ask before then."

Say: "The bot will not ask this person again until that date. If the lab typed the unit
as a different group from what the donor believed, the typed result replaces the
belief."

Record the second donor the same way. The demand is now complete. If a third phone were
still holding a place, it would receive "That B- request is covered now."

### Step 9. The collected unit goes on the register (Centre tab, 1 minute)

Open **Register blood bags**. Enter the unit number from step 8, choose **B-** (the list
opens on A+, so change it deliberately), Packed Red Blood Cells, today's date. Press
**Register the bag**.

Say: "Expiry is worked out from the collection date and the shelf life the centre set,
not from today. If the bag carries a printed expiry, the label wins and any mismatch is
flagged."

### Step 10. Follow the unit end to end (Administration tab, 2 minutes)

Sign in as `admin@obdm.invalid`. Open **Control panel**, then **Follow one
request**. Paste the request ID from step 1 and press **Follow it**.

Show the timeline: request raised, patient identified, centre decided, bags issued,
demand raised, bot picked it up, donor confirmed, audit rows in between.

Say: "Every step, in order, with who did it. Notice what is not here: no patient name,
no donor name. The administration app cannot read the donor register at all. Reading
this trace is itself written to the audit log."

Scroll up to the tiles. Say: "And this is how the hospital knows the system is healthy.
Each tile does real work to check, for example a real email handshake. If the bot
stops, this page says so within five minutes, and it says what that means: nobody is
being asked."

---

## 6. Safety screens, after the story

Pick two or three depending on time. Each takes about a minute.

**Cancel with stand-down (Doctor tab).** Raise a second B- request, issue it at the
centre so a demand opens, then cancel it from the doctor app with a reason. Show the
phone receiving "Thank you. You are no longer needed for that request. Please do not
travel for this one." Say: "A request showing cancelled while units stay held and a
donor is on a bus is the failure this system is built to avoid. One action, three
things undone."

**The Stop screen (Centre tab).** Open **Scan a tag**. Type the tag identifier of a bag
that is on the shelf. Show the Stop text. Say: "The register says this bag is on the
shelf. Either the register is stale, two bags carry this tag, or the tag is cloned.
Every one of those can put the wrong unit into a patient. There is no button to
override this. Someone has to go and look."

**A return that cannot go back (Centre tab).** Scan a tag on an issued bag. Choose
"Nobody can say" for time out of storage. Show that "Back on the shelf" is not offered.
Say: "The database enforces the same rule. It cannot be worked around from a screen."

**What the donor controls (Phone).** Type `profile`, then `pause`, then `resume`. Show
the `delete` confirmation without confirming it. Say: "Deleting removes the name and
number everywhere, including from the roster. The unit number and the date stay, with
the name replaced by 'Deleted donor', because the law requires the unit to be
traceable."

**Adding a doctor (Administration tab and Mailpit).** Press **Add a doctor**, fill in a
name and email, press **Create and send invite**. Open Mailpit and show the invite
email. Say: "The administrator never sees or sets a password. The doctor sets their own
from a link that works once."

---

## 7. What to avoid on the day

- **Do not run the seed** during or just before the demo. It resets accounts and stock.
- **Do not press "Recruit for N groups below the floor"** unless you have rehearsed it.
  It raises one demand per short group, and every registered phone in a compatible
  group is messaged. With the demo state that is five groups at once.
- **Do not use the "Forgot your password?" link on the administration sign-in page.**
  It leads to a page that does not exist. Use the doctor app's reset page if needed.
- **Do not leave the register form's blood group on its default.** It opens on A+.
- **Do not show the six-week trend table** unless asked. It includes closed and future
  demands and will not match the tiles.
- **Do not open the doctor's Patients card in the admin app** casually. It is audited
  by record and you will be asked why it exists. If asked, show it and explain that.
- **Do not promise the timing.** The ticker runs every fifteen seconds and the phone
  refreshes every few seconds. Say "within about fifteen seconds" and keep talking
  while you wait.

---

## 8. Questions they will ask

**Is this a medical device?** No. It never picks a compatible group, never decides
eligibility, and never replaces the pre-transfusion test. It records what people
decided. The footer of every page says so.

**Who can see the patient?** The doctor who raised the request, the blood centre, and
an administrator through the doctor's patient list, which is audited by record. The
donor, the volunteer and the public board never see the patient.

**Who can see the donor?** The blood centre, only after the donor has said yes to a
specific request, and only on the roster for that request. The administration app
holds no access to the donor register at all.

**What if the internet goes down?** The staff apps show "You are offline" rather than
an old stock figure, because an old stock figure is a wrong one. The bot queues
messages and sends them when the platform is back. The control panel shows a queue
building and a silent bot.

**Why a web app and not WhatsApp or Telegram?** It started on Telegram. A donor
needed that app and an account before they could say hello, and the hospital depended
on a platform it does not control. The web app needs a browser and nothing else, and
the conversation is identical because the bot talks to its channel through one
adapter. WhatsApp, when wanted, is another adapter behind the same port.

**Can it substitute O- for a B- patient?** No. It issues the exact group and product
requested. Substitution is a clinical decision. It does ask O- donors for a B- patient,
because that is recruitment, not issue, and the unit is typed before it is used.

**Is any of this real data?** No. Every donor, patient and staff record is synthetic.
The demo email domain cannot resolve. The seed refuses to run in production.

**What about RFID readers and the fridge camera?** The register accepts a tag from any
reader that types. The camera that counts the shelf is a later phase. The plan is in
the build plan.

**Who can change the stock floor or the shelf lives?** The centre, on its settings
screen, with every change audited. Administrators cannot.

**How does a doctor get an account?** An administrator creates it. The doctor sets
their own password from an emailed link. Nobody else ever knows it.

**What happens to a donor's data if they leave?** They type `delete`. Name, number,
answers and location are removed. Donation records keep the unit number and date with
the name replaced.

---

## 9. If something goes wrong mid-demo

| Symptom | What to do |
|---|---|
| Phone does not buzz within a minute | Check the bot terminal. If it is down, play the rehearsal recording and continue from step 6 using the rehearsal's roster |
| Centre says "The centre settings are incomplete" | Open Centre settings and press Save settings. The district is already set |
| "Somebody answered this request a moment ago" | You double-clicked. Reload |
| Volunteer tile does not move | It refreshes every minute. Reload the tab |
| Board says "not published" | The flag was not set, section 3.4. Skip the board and show the volunteer message instead |
| Control panel shows bot Silent | Restart `pnpm dev` (the donor app carries the ticker) and say what the tile just did: it told you |
| Phone shows "Could not reach OBDM" | The phone cannot reach the laptop. Check both are on the demo network, or open the donor app in a second browser window on the laptop |

Say what happened, plainly. A system that shows its own failure on a panel is part of
what you are demonstrating.
