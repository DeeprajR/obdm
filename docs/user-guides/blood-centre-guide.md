# Blood centre guide

This guide is for staff at the hospital blood centre: the counter, the fridge and the
register. You answer requests from stock, keep the register accurate, recruit donors
when the shelf is short, and record every donor who comes in.

The system never chooses a compatible substitute for you. It issues the exact group and
product asked for. Anything else is a clinical decision made by a person.

On the demo machine the blood centre app is at http://localhost:3002. On a real
installation the address will be different. Ask your administrator.

---

## 1. Signing in

An administrator creates your account and you get an email with a link. Open it,
choose a password of at least 6 characters, and press **Set password and sign in**.
You land on the overview.

After that, open the blood centre app and press **Sign in**. Your session lasts 12
hours. When it ends you are sent to the sign-in page, and after signing in you return
to the page you were on.

The sign-in page says "For blood centre staff". If you are a doctor or a volunteer
admin, use the links under the form to reach your own app.

"Email or password is incorrect." means exactly that, or that you are on another app's
sign-in page. After too many wrong tries you see "Too many attempts. Try again in N
minutes."

---

## 2. Finding your way around

The menu has four items:

| Menu item | What it is for |
|---|---|
| **Dashboard** | The overview: stock against the floor, who is coming in, what is recruiting |
| **Blood requests** | The queue of requests waiting for an answer |
| **Donation status** | Who is expected at the counter and what has been collected |
| **Register blood bags** | Add a new unit to the register |

Other screens are reached from buttons on the dashboard: **Register a bag**, **Scan a
tag**, **View stock**, **Quarantine**, **Open demands** and **Centre settings**.

The header shows your name, email and role. The footer on every page carries the
notice that this is not a medical device.

The dashboard, the request queue and the demand list refresh themselves every 30
seconds while the tab is in front of you. A tab left in the background does not
refresh, but it refreshes as soon as you return to it.

---

## 3. The dashboard

The dashboard is titled **Overview**.

**The top button** says **Request queue**, or **Answer N waiting** when requests are
waiting.

**Red alerts** appear only when needed: open tag discrepancies, or requests past the
day the blood was needed. Each has a link to the screen that fixes it.

**Stock on hand against the stock floor.** A bar for each group, showing units on the
shelf against the floor. This counts whole blood and packed red cells only, because
those are what a donor can replace. Reserved units are not counted. They already belong
to a decision. The table under it shows, per group: on the shelf, reserved, floor,
short by, and how many expire within 7 days. A legend called "What the colours mean"
sits under the chart.

The bands are:

| Band | Meaning |
|---|---|
| At or above the floor | Fine. Also shown for every group when no floor is set |
| Below the floor | Between 60% and 100% of the floor |
| Short. Recruit | Between 30% and 60% of the floor |
| Critically low | Under 30% of the floor |
| None on the shelf | Zero |

The 60% and 30% points are configuration values and can be changed by the people who
run the system.

Under the chart is the **Recruit** button, with a note explaining that it raises one
demand per short group and skips any group that already has an open floor demand. See
section 12.

**Donations.** The next five donors expected and the last five donations recorded,
with an **All donations** link to the Donation status page.

**Recruitment in progress.** How many demands are open, and how many the donor bot has
not picked up yet. Nobody has been contacted for those.

**The register.** How many units are reserved and how many are in quarantine, with
buttons to register a bag, scan a tag, view stock and open quarantine.

**Open donor demand.** The first eight demands that are still recruiting, with how many
donors were notified and how many units are confirmed. A demand that has enough donors
confirmed drops off this table but still appears on the demands page.

---

## 4. The request queue

Open **Blood requests**. The list shows every request that has not been answered, most
urgent first, then longest waiting.

| Column | Meaning |
|---|---|
| Request ID | The ID the doctor read to the bystander, like `090926-00001` |
| Urgency | Emergency, Very urgent, Urgent or Routine |
| Waiting | Time since the doctor sent it. A red **Late** badge means it has passed its answer target: 15 minutes for emergency, 1 hour for very urgent, 4 hours for urgent |
| Patient | The patient's name, or "no patient yet" |
| Wanted | Units, product and group |
| Date required | Worked out from the urgency. A red **Overdue** badge means the date has passed |
| Group stock | Units of whole blood and red cells on the shelf for that group. Not the exact product. Open the request to see that |

The last column is a button. It says **Take details** when there is no patient yet, or
**Answer** when there is.

A banner at the top counts the requests with no patient: "Take the details from the
bystander before issuing."

When the queue is empty: "Nothing waiting. Every submitted request has been answered."

---

## 5. A bystander arrives with an ID

The doctor gave the bystander an ID like `090926-00001`. Find it in the queue and open
it. If the request has no patient, the first card is **Who is this for?**

Fill in:

| Field | Required | Notes |
|---|---|---|
| Patient name | Yes | |
| IP number | Yes | From the ward. It identifies the admission |
| Ward number | No | |
| Patient's own ABO group and RhD type | Yes | What the patient **is**, not what was asked for. The hint says: "The centre types every unit before it is used." |
| Age and age unit | One of these | Years, months or days. A newborn is usually in days |
| Date of birth | One of these | Year, month, day |
| Sex | No | Not stated, Female, Male or Other |

Open **Contact and clinical context** ("Optional, ask while they are here") to add
hospital ID, attender name and phone, address, diagnosis, history, previous
transfusion (Unknown, Yes or No) and any reaction to a previous transfusion.

Press **Record the patient**. The page says "Patient recorded. This request can be
answered now."

If you missed something, the form tells you which field and keeps everything else you
typed.

**If the IP number already exists**, the request is attached to that existing
admission, and the other details you typed on this form are not saved. The existing
record is used as it is. If those details need correcting, do it on the patient record.

**Why patient first?** A unit that leaves the fridge has to be traceable to a named
person. The system refuses to answer or decline a request with no patient, with one
exception:

**Emergency.** An emergency request may be answered before the bystander arrives. The
page then carries a warning: "This request was already answered without one, which only
an emergency allows. Completing the patient is outstanding." Take the details as soon
as the bystander turns up.

---

## 6. Answering a request

Open the request. The page says the patient details were recorded onto the request
when it was submitted and do not change afterwards. The patient card shows the product,
units, requested group, date required, indication, and who requested it.

Two warnings may appear at the top:

- "This is past the day the blood was needed." on an undecided overdue request.
- "The patient has been discharged. The request still stands. Check with the ward
  before issuing."

The card **Answer this request** tells you how many units of the exact product and
group are on the shelf right now, and what will happen:

- "All N units can be issued from stock."
- "M of N units are on the shelf. The remaining K will raise a donor demand in the same
  transaction."
- For platelets, plasma or cryoprecipitate with a shortfall: "This component is
  separated in a lab, so no donors are recruited for it."

You do not type a number of units. You have two choices.

**Issue.** Press **Issue the units** (when stock covers it) or **Issue what is on the
shelf** (when it does not). You can add a note. The system, in one step:

1. Picks the units with the shortest expiry, exact group and product.
2. Reserves them for this request.
3. Records the decision: **Approved in full**, **Partly approved**, or **Declined** if
   the shelf was empty.
4. For whole blood and red cells, raises a donor demand for any shortfall.

**Decline.** Fill in **Reason for declining** and press **Decline the request**. Use
this for a duplicate or a request the centre is refusing. It issues nothing and
recruits nobody. Do not use it for an empty shelf. Use **Issue what is on the shelf**
for that, so donors are recruited.

A decline needs a patient on the request, the same as an issue, unless the request is
an emergency. If you press Decline on a non-emergency request with no patient, the
page tells you to take the details first.

After answering, the page shows the decision card: how many units were issued, a table
of the units held (unit number, expiry date, status) with the note "These units are
held for this request until they leave the fridge.", and a link to the recruitment if a
demand was raised.

**A decision is never edited.** If it was wrong, the ward raises a new request.

If two people answer at once, the second sees: "Somebody answered this request a moment
ago. Nothing you entered was saved: reload to see the answer that was recorded."

If the settings have no hospital name or district, a request that would raise a demand
is refused: "The centre settings are incomplete, so donors cannot be told where to
come. Set the hospital name and the district on the settings screen first." See
section 16.

---

## 7. Registering a new bag

Open **Register blood bags**. The page says to type the unit number or read it with a
scanner.

| Field | Required | Notes |
|---|---|---|
| Unit number | Yes | Type it, or scan it with a reader that types |
| ABO group and RhD type | Yes | The list opens on A+. Check it every time. There is no blank choice, so a bag saved without changing it is registered as A+ |
| Product | Yes | Packed Red Blood Cells is selected by default |
| Collection date | Yes | Defaults to today. Cannot be in the future. The expiry is counted from this day, not from today |
| Expiry printed on the bag | No | Only if the bag carries one |
| Tag identifier | No | If the bag carries a tag |
| Source | No | Camp, replacement donor, transfer in |

As soon as you choose a product and a collection date, the page shows the expiry it has
worked out, for example: "Expiry date: 2026-01-20: 42 days for Packed Red Blood Cells
(PRBC)." The clock runs from collection, not from today.

**If the bag has a printed expiry**, type it. The printed label wins. If it disagrees
with the worked-out date, the bag is still saved, and the register shows a warning:
"That bag was registered with the expiry printed on its label, which did not match the
date derived from its collection. Check the unit against the label." The row shows
"(label)" next to the expiry.

Press **Register the bag**. You land on the register.

Refusals you may see: "A bag with that unit number is already registered.", "The
collection date cannot be in the future.", "The label expiry cannot be before the
collection date.", or "No shelf life is configured for prbc. Set it on the settings
screen." (with the product code of the bag you were registering).

---

## 8. The register (stock list)

Open **View stock** from the dashboard. The page says: "One row per physical bag,
shortest-dated first, which is the order units are issued in."

Choose a group, product and status, then press **Filter**. Group and product have an
"All" choice. Status does not: you see one status at a time. It starts on
**available**. The other statuses are reserved, issued, returned, quarantined,
discarded, expired and lost. If nothing matches, the page says "Nothing matches that
filter."

Each row shows unit number, group, product, collection date, expiry, days left and
status. Days left turns red at 7 days or less, and reads "expired" past the date. A
background task marks past-date available bags as expired.

**Discarding from the register.** Bags that are available, quarantined, returned or
expired have a **Discard** button. Press it, and two boxes open: **Reason** and
**Disposal route**, which is where the unit physically went. Both are required. Press
**Discard the unit**. The row then reads "Discarded". Every discard in the system asks
for a disposal route. Discarding a quarantined bag also closes its quarantine record.

A unit marked **lost** cannot be discarded. Nobody knows where it went, so there is no
disposal route.

---

## 9. Scanning a tag

Open **Scan a tag**. Type or scan the tag identifier and press **Look it up**. The
result card shows what the register knows about that tag: unit number, group, product,
expiry and status, or "Nothing is on this tag." What you can do next depends on that.
There are five outcomes.

**The tag is free.** "This tag is free. Register the bag in your hand against it."
Press **Register a bag on this tag** and the intake form opens with the tag filled in.

**The bag on it is out of the centre (issued or reserved). This is a return.** The page
says: "This unit is out of the centre. If it has come back, record the return. Do not
register it again." See section 10.

**The bag on it is finished (discarded, expired, lost or returned). Release, then
re-register.** The page says to release the tag first and then register the new bag as
a new record with its own expiry. Answer **Why is the tag being released?** Tick
**Retire this tag. It reads unreliably** if so, and it can never be used again. Press
**Release the tag**. The page says: "Released. Register the new bag through the intake
form. It gets its own collection date and its own expiry." There is no "reassign"
button, on purpose.

**The register says the bag on it is on the shelf right now, or in quarantine. Stop.**
The page says:

> Stop. The register says [unit] is on the shelf right now. That means the register is
> stale, two bags carry this tag, or the tag is cloned, and every one of those can put
> the wrong unit into a patient. Do not register anything on this tag. Go and find
> [unit] physically first.

This screen appears for a bag in quarantine as well as one on the shelf, and the
wording is the same. There is no way to register anything here. Type what you saw and
press **Raise a discrepancy**. The page says: "Raised. It stays open until somebody has
physically looked." If one is already open for this tag, the page tells you and points
to the list below.

**The tag was retired.** "This tag was retired and can never carry a bag again. Use a
fresh one."

### Closing a discrepancy

Open discrepancies are listed at the bottom of the Scan a tag screen. When there are
none, it says "None open." They never close by themselves. Go and look at the shelf,
then choose what you found. The form shows what will happen before you submit:

| What you found | What the system says it will do |
|---|---|
| The conflicting bag is on the shelf | "This tag is a duplicate or a clone. It will be retired for good." |
| The conflicting bag is not there | "It left without being scanned out. It will be marked lost, a reportable event, and the tag freed." |
| It was a mis-scan | "Nothing changes. The bag is on the shelf and so is its tag." |

Under **What you found**, write what you saw. It is recorded with your name as the
record of the investigation. Press **Close the discrepancy**.

---

## 10. Recording a return

A unit that was issued or reserved and has come back is a return, never a new
registration. Scan its tag. The form asks, in this order:

1. **How long was it out of controlled storage?** Under 30 minutes, in a transport
   fridge · Longer than 30 minutes, within our limit · Longer than our limit · Nobody
   can say. The limit comes from your centre's own SOP and is shown on screen.
2. **The cold chain is documented.** Tick if so. This is optional.
3. **What happens to it?** Back on the shelf · Quarantine, pending a decision · Discard.
4. **Disposal route**, only for Discard.
5. A note. Optional.

**Back on the shelf is offered only for "Under 30 minutes".** For any longer time, the
page says "It was out too long to go back on the shelf." If nobody can say, it says
"Because nobody can say how long it was out, this unit cannot go back on the shelf." In
both cases the only choices are quarantine (the default) and discard. The database
enforces the same rule, so it cannot be worked around.

The expiry date is never recalculated on return.

Press **Record the return**. It says "Return recorded."

---

## 11. Quarantine

Open **Quarantine** from the dashboard. A unit here is out of issue and does not count
toward the stock floor until a named person decides. When it is empty, the page says
"Nothing in quarantine."

Each unit shows its group, product and expiry, its reason ("Time out of controlled
storage unknown" or "Out of controlled storage beyond the limit"), and how long it has
waited. At 7 days it shows a red **Overdue** badge, and the page shows an alert: "N
units have been waiting longer than 7 days. Nothing should sit here indefinitely." The
7 days is a configuration value.

For each unit choose **Back on the shelf** or **Discard** (with a disposal route), write
what was decided and why, and press **Resolve**.

A unit that reaches its expiry while in quarantine is discarded automatically, with
the reason "Expired while in quarantine" and the disposal route "Clinical waste,
pending centre confirmation". Confirm where it actually went.

---

## 12. The stock floor and recruiting donors

The **stock floor** is the minimum number of red cell units you want on the shelf for
every group. It is set in Centre settings and defaults to 25. It counts whole blood and
packed red cells only, and does not count reserved units.

On the dashboard, under the stock chart, the recruit button reads one of:

- **Every group is above the floor** (nothing to do)
- **Recruit for N groups below the floor**

Press it to raise one donor demand per short group, for whole blood, for exactly the
shortfall, needed today. A group that already has an open floor demand is skipped, so
pressing it twice recruits nobody twice. There is no confirmation dialog.

**Set the hospital name, address and district first.** Donors have to be told where to
come. If any of these is missing, pressing the button does nothing, and no message is
shown. Open Centre settings, fill them in, and try again.

---

## 13. Demand: watching recruitment

Open **Open demands** from the dashboard. A demand is a request to the donor bot for a
number of units of one group. It is raised by a request shortfall or by the stock
floor. When nothing is recruiting, the page says "No recruitment in progress."

**Recruiting now** lists demands that are open or that have enough donors confirmed
but are not yet complete:

| Column | Meaning |
|---|---|
| Group, Product, Units | What is wanted |
| Raised by | "Request shortfall" or "Stock floor" |
| Needed by | The date |
| Notified | How many donors the bot has messaged, or "not picked up" if the bot has not started yet |
| Confirmed | Units donors have confirmed, over units wanted. "(+N waiting)" is the waiting list |
| Status | Open · Enough donors confirmed · Completed · Withdrawn · Expired |
| Counter | The **Donors** button, with a count of confirmed donors not yet marked |

These numbers are written by the donor bot. The bot asks up to 20 donors at a time,
nearest first, and asks the next 20 every 30 minutes until the units are covered.

If a demand has been picked up but nobody was notified, the page explains: "Nobody in
the donor pool can answer this group today. Either no registered donor has a matching
group nearby, or the ones who do gave recently and are still inside the gap between
donations. It is not a fault: the list refills as people become due again."

**Withdrawing a demand.** Press **Withdraw** on the row, answer **Why is this being
withdrawn?**, and press **Withdraw the demand**. The form says: "Every donor holding a
unit for this is told it has ended." Afterwards the page says "Withdrawn. Donors are
being stood down." A reason is required.

**Closed** demands are listed below with group, units, completed, status and the date
raised.

Donor names and phone numbers do not appear on this list. They are behind the
**Donors** button, where someone is calling a name at a desk.

---

## 14. Donors coming in: the roster

Press **Donors** on a demand. The page is titled with the group and product, and says,
for example: "4 units wanted by 2026-09-23. 2 collected from the donors we asked, and
1 from people who simply came in."

**Expected at the counter.** One card per confirmed donor with their name, phone, group
and channel. A number typed into the donor app cannot be checked by the app, so the
phone reads "not verified": confirm it with the donor when they arrive. When the donor arrives and has given, or did not come:

1. Choose the outcome: **Donated**, **No-show** or **Cancelled**.
2. For Donated, type the **unit number** collected and choose the **group the unit
   typed as**. This may differ from what the donor told the bot. It is what confirms
   their group for future requests.
3. Press **Record**.

A no-show frees the place, and so does Cancelled, which is for a donor who let you know
they could not come. The bot offers the place to the next person on the waiting list,
and if nobody is waiting it starts asking donors again. Each donor is marked once. After Donated, the bot thanks the donor and tells them
when they can give again. Until then, the card notes "The bot has not thanked this
donor yet." When nobody is expected, the section says "Nobody is expected right now."

**Somebody gave who is not on this list.** If a person walks in and donates without
ever being asked by the bot, press **Record a walk-in**. Give their name, phone, the
group the unit typed as, and the unit number. Press **Record the donation**. The
donation counts against the demand, and the bot stops recruiting for units already
collected. Donors who already said yes are still expected. They are not turned away.
This card disappears once the demand is closed.

**Walk-ins** lists the walk-in donations recorded for this demand: donor, group, unit
number and date.

**Already marked** lists every donor from the bot's roster who has been recorded, with
outcome, unit number, the group the unit typed as, and the date. A no-show reads back
as "Did not come". If the typed group differs from what the donor said, it shows "(told
us B+)" beside it. Walk-ins are not in this table. They are in the Walk-ins section
above it.

---

## 15. Donation status

Open **Donation status** in the menu. It is a read-only overview:

- **Coming in.** Confirmed donors for demands still recruiting, soonest first, with a
  **See donors** link to the roster.
- **Already given.** Donors the bot asked and walk-ins together, newest first, with
  unit number and date.

No phone numbers appear on this screen. Marking a donor happens on the roster.

---

## 16. Centre settings

Open **Centre settings** from the bottom of the dashboard. The page is titled
**Settings**: "What donors are told, and the numbers the register runs on."

**Identity and the stock floor**

| Setting | What it does |
|---|---|
| Hospital name | Donors are shown this. Required |
| Address | Donors are told to come here. Changing it changes what the next donor is told, not the last one. Required |
| District | Recruitment orders donors by how near they are. Without a district, no demand can be raised. The list includes "Not set", and the form lets you save with it, so check it |
| Stock floor | Red cell units per group. Below this, the group is offered for recruitment. Defaults to 25 |
| Return time limit (minutes) | From your transfusion SOP. Used by the return flow. Defaults to 30 |

Press **Save settings**. The page says "Saved."

**Shelf life per component.** Whole days from collection, one row for each of the five
products. Each row has its own **Save** button and saves only that product. The button
reads "Saved" once done. A change applies to bags registered from then on. Units
already on the shelf keep the expiry they were registered with.

Every change is recorded in the audit log with your name. Settings need a separate
permission from day-to-day operation, so not every centre account can open this page.

---

## 17. Your account

Click your name at the top right to open **Your profile**.

**Your details.** Your name, email and registration number.

**Change your email address.** Type the new one and press **Send the confirmation**.
Open the link sent to the new address and the change applies. While it is waiting, the
profile shows the new address with a **Cancel this change** button.

**Change your password.** Press **Change password**. This opens the reset page. Under
**Send me a code**, enter your email and press the button. A six-digit code arrives by
email and is valid for ten minutes. Then under **I have a code**, enter your email, the
code and a new password, and press **Set the new password**. This signs you in and
ends every other session.

**Change your name or registration.** An administrator has to agree. In the card **Ask
to change your name or registration**, choose **Full name** or **Registration number**,
type what it should say and why, and press **Send the request**. The profile shows
"Waiting on your administrator" with a **Withdraw it** button until it is decided.

**Sign out** with the button at the top right.

---

## 18. Using it on your phone

Open the blood centre app in your phone's browser and choose **Add to home screen** or
**Install app**. It still needs a connection. If you lose signal it shows "You are
offline" rather than an old stock figure. Reconnect and reload the page.

---

## 19. Common problems

**"No patient has been identified for this request. Take their details from the
bystander before issuing, only an emergency may be answered first."** Take the
bystander's details first (section 5). This applies to declining as well as issuing.

**"Somebody answered this request a moment ago."** A colleague got there first. Reload.

**The Notified column says "not picked up".** The donor bot has not started on that
demand yet. If it stays that way, tell your administrator. The bot may not be running.

**"The centre settings are incomplete."** Set the hospital name, address and district
in Centre settings.

**The Recruit button does nothing.** The hospital name, address or district is not set.
Fill them in on the settings screen and press the button again.

**A tag I scanned says Stop.** Do not register anything. Go and find the unit named on
screen. It may be on the shelf or in quarantine. Raise a discrepancy so it is on
record.

**A unit came back and I cannot put it on the shelf.** It was out too long, or nobody
can say how long. Quarantine it and let a named person decide.

**I registered a bag with the wrong group.** The group list opens on A+. A registered
bag cannot be edited. Discard it with a reason and register it again with the right
group.

**"Not available. This account does not have access to this part of OBDM."**
You opened a page your account cannot use. The page has no link back, so use the
browser's back button or the menu.
