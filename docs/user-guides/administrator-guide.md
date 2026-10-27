# Administrator guide

This guide is for administrators. You manage doctor accounts, decide staff requests to
change a name or registration number, and use the control panel to see whether the
system is healthy.

The administration app has no clinical function. It cannot raise, answer or cancel a
blood request, and it cannot see any donor. This is by design.

On the demo machine the administration app is at http://localhost:3001. On a real
installation the address will be different.

---

## 1. Signing in

Open the administration app and press **Sign in**. Use the email and password of your
administrator account. You land on the **Doctors** list. Your session lasts 12 hours.

The sign-in page says "Administrator accounts only. Clinical accounts sign in to the
main application." Only administrator accounts work here. Any other account sees
"Email or password is incorrect."

After too many wrong tries you see "Too many attempts. Try again in N minutes." Wait
and try again.

**Forgot your password?** The administration app does not have its own reset page. The
"Forgot your password?" link on its sign-in page currently leads to a page that does not
exist. Use the reset page of one of the staff apps instead. On the demo machine that is
http://localhost:3000/reset.

1. Under **Send me a code**, enter your email and press the button. A six-digit code
   arrives by email and is valid for ten minutes.
2. Under **I have a code**, enter your email, the code and a new password, and press
   **Set the new password**.
3. The page sends you back to the administration sign-in page. The new password works
   there.

Setting a new password ends every other session you had open.

---

## 2. Finding your way around

The header shows your name and email and has three links:

| Link | What it is for |
|---|---|
| **Doctors** | Every doctor account: add, edit, deactivate, and see their patients |
| **Update requests** | Staff asking to change their name or registration number |
| **Control panel** | Whether the system is working, and what is waiting on somebody |

The app title "OBDM administration" also takes you to the Doctors list.

---

## 3. The doctors list

The list shows every doctor account, newest first, with a count of records at the top.
Each row shows the name, email, registration number, status, whether a seal is
uploaded, and the date added.

Status is one of:

- **Active**
- **Invited, not yet activated**. After the first day, the row also shows how many days
  it has been since the account was created, so an unused invite is easy to spot.
- **Deactivated**

Click a name to open that doctor's page.

If there are no doctors yet, the list says "No doctors yet. Adding one sends them an
invite to set a password."

---

## 4. Adding a doctor

Press **Add a doctor**.

| Field | Required | Notes |
|---|---|---|
| Full name | Yes | |
| Email address | Yes | The invite goes here. The doctor sets their own password from it |
| Provisional registration number | No | Must be unique across all accounts |

There is no password field. You never choose, see or know a doctor's password.

Press **Create and send invite**. The account is created and an email with the subject
"Set up your OBDM account" goes to the doctor. The link in it works once and
expires after 48 hours. The doctor opens it, chooses a password, and is signed in to the
doctor app.

You land on the doctor's page, which says "Invited. They have not set a password yet."

If the email address already belongs to an account, the form says "That email address
already belongs to an account." If the registration number is already in use, the page
shows an error instead of a form message. Check the number and try again.

On the demo machine, all email lands in Mailpit at http://localhost:8025.

---

## 5. A doctor's page

Under the heading, a line shows the account's state: "Active.", "Invited. They have not
set a password yet." or "Deactivated. They cannot sign in and every session has ended."

The page has four cards and a patient list.

**Details.** Change the full name or registration number and press **Save details**.
Both the old and new values are written to the audit log.

**Email address.** Type a new address and press **Change address**. The change applies
at once, with no confirmation step. An email is sent to the old address so the doctor
knows. Note that this email uses the same wording as the doctor's own self-service
change, so it says the change takes effect when the new address confirms it. In your
case it has already taken effect. Tell the doctor directly if there is any doubt.

**Seal.** The doctor's seal image, shown on blood requests. Upload a PNG of 1 MB or
smaller and press **Upload seal**. The image is stored privately and shown only to
signed-in staff. If no seal is uploaded, the card says "No seal uploaded." Press
**Remove seal** to take it off. Removing a seal keeps the stored file, so requests
already signed with it still show it.

If the file is refused, the message says why: "The seal must be a PNG image.", "The
seal must be 1 MB or smaller." or "That file could not be read as a PNG image."

**Access.**

- **Send the invite again** appears while the doctor has not set a password. It sends a
  new link with the subject "Your OBDM sign-up link". The earlier link stops
  working.
- **Deactivate** ends every session at once and emails the doctor. The record is kept.
  Nothing is ever deleted, because the audit history must survive.
- **Reactivate** brings a deactivated doctor back. If they never set a password, they
  return to "Invited" and need a fresh invite.

**Patients.** Every patient this doctor has requested blood for, live and historical.
The table shows the patient, hospital ID, IP number, ward, group, status, number of
requests, and known diagnosis. Only patients attached to an admission appear here.

This is the widest view of patient data anyone in the system has. Opening the page is
recorded in the audit log, naming every record shown. The card says so on screen. Open
it only when you need to.

If the doctor has not raised any requests yet, the card says "This doctor has not
requested blood for anyone yet."

---

## 6. Update requests

Staff cannot change their own name or registration number, because both appear on the
records they create. Instead they send you a request from their profile. Requests from
doctors, blood centre staff and volunteer admins all arrive here, oldest first.

Each card shows who is asking, which field, the current value, the proposed value, the
reason they gave, and how long it has waited: "Today", "Waiting 1 day" or "Waiting N
days". From 7 days the age is shown in red.

- **Approve and apply.** The system writes the new value onto the account. You do not
  retype it.
- **Reject.** Under "Or reject it, with a reason they can act on", type a reason of up
  to 500 characters and press **Reject**. A reason is required. The person sees your
  note on their profile.

You cannot decide your own request. The card says "This is your own request. Another
administrator has to decide it."

When the queue is empty, the page says "Nothing is waiting."

Email address changes never come here. Staff confirm those themselves from the new
inbox.

---

## 7. The control panel

Open **Control panel**. It only reads. The page says: "This screen reads. It cannot
answer a request, resolve a quarantine or change a threshold." It also shows the time it
was checked.

Read it top to bottom: is anything broken, is anything waiting, is anything slow, and
what is this deployment running.

### Dependencies

One tile each for the database, email (SMTP), object storage and the shared contract
version. Each shows a word, **Working**, **Degraded** or **Down**, a short detail line,
the time of the check and how long it took, and a "what to do" line. On a healthy tile
the last line reads "Nothing to do." The checks do real work, for example a real email
handshake, not a ping.

Two more tiles show whether the **web release** and the **donor bot** are still
reporting. Each says **Reporting** or **Silent**, with when it was last heard from and
which contract version and build it runs. A heartbeat older than 5 minutes counts as
Silent. If the bot is silent, no donors are being messaged.

### What is waiting on somebody

When all is well it says: "Nothing is waiting on anybody. Every queue is empty and every
hold is inside its window."

Otherwise it shows a list, most urgent first. Each row has a count, a level ("Somebody
is waiting", "Today" or "For information"), how old the oldest item is, and what to do.
Some rows also have a button to the screen that fixes it, which may be in another app.

| Alert | What to do |
|---|---|
| Emails queued and not sent | Check the SMTP tile. An invite, a reset code or an address-change warning is waiting behind this |
| Emails the provider would not deliver | Open the account and check the address. A bounce usually means a typo. This row has a button to the Doctors list |
| Quarantined units past their hold | Someone at the centre must resolve each one on the quarantine screen. This row has a button to that screen |
| Tag discrepancies nobody has closed | Somebody has to physically look at the shelf and record what they found. This row has a button to the Scan a tag screen |
| Messages queued to donors and not sent | Check the bot is running. A donor may still be holding a place for a request that has ended |
| Messages the chat platform refused | Read the last error on the bot host |
| Waves whose turn passed without firing | The bot's ticker is not running, or it is failing. Nobody is being invited |
| Background jobs that gave up | Read the last error on the bot host. These do not retry on their own |
| The donor bot has stopped reporting | Check the bot host is running. Nothing on the page about the bot is current |
| The web release has stopped reporting | If this page loaded, the web release is up. On a quiet system this heartbeat can show late |

If the panel could not read one of its sources, a warning explains which rows are
missing. For example: "The bot has never published its health. Either it has not run
against this database, or it is on a release older than contract 1.3.0."

### Traffic, last 24 hours

A row of chips counts responses by status class, for example "2xx 1423" and "5xx 3".
Then two tables: one per app with request counts, error rate and response times, and
one for the 25 busiest routes with the slowest response time. Errors mean server errors.
Routes are shown as patterns, never real paths, so no record ID appears here. Before
anything has been served, the tables say "Nothing served in the window yet."

### Follow one request

Press **Follow one request**. The page says: "Paste a request number from the slip, a
demand id, or a correlation id from a log line. Reading a trace is recorded in the
audit log." Enter it in the **Identifier** field and press **Follow it**.

You get a timeline with the columns When, Step, What happened and Record: request
raised, patient identified, centre decided, bags issued, demand raised, bot picked it
up, donor confirmed, and up to 50 audit log entries. It shows group, product, units and
urgency, never who the blood is for. Notes under the table explain what the trace
cannot show, for example that the bot's own event log is not readable from this app.

If nothing matches, it says: "Nothing matched. Try the request number as it appears on
the slip, a demand id, or a correlation id from a log line."

### This deployment

At the bottom of the panel, the line "Which configuration is actually in force, and
which migrations this database has." contains the link **Open the deployment view**.

The view is read-only. It shows the contract version the build was compiled against and
the one stored in the database, the build, the Node version, the number of migrations
applied and when the last one ran. Below that is every configuration value in force,
with a **Source** column that says "compiled default" or "this database" with the date
it was changed. A line at the top says how many values are overridden.

If the build and the database disagree on the contract version, a red banner says so
and asks you to ship both releases together or roll the newer one back.

Changing a threshold is a clinical decision and happens on its own audited screen, not
here.

---

## 8. What you cannot see, and why

- **No donors.** The administration app has no access to the donor bot's data. A panel
  that could read donor names and numbers would be a second copy of the donor register
  behind an admin login. The bot publishes counts only.
- **No clinical actions.** You cannot raise, answer or cancel requests, or change stock.
- **No patient identity in operational data.** Traces and traffic tables carry no
  patient details.
- **No other staff accounts.** This app creates and manages doctor accounts only. Blood
  centre, volunteer admin and administrator accounts are created by the seed or by
  someone with database access. The doctors list and doctor pages only show doctor
  accounts, so administrator accounts cannot be opened or deactivated here.

---

## 9. Your own account

- **Sign out** with the button in the header.
- **Password.** See section 1. Use a staff app's reset page.
- **Email address and name.** There is no profile page in the administration app.
  Someone with database access changes these.

---

## 10. Using it on your phone

Open the administration app in your phone's browser and choose **Add to home screen**
or **Install app**. It still needs a connection. If you lose signal it shows "You are
offline". Reconnect and reload the page.

---

## 11. Common problems

**A doctor says the invite link does not work.** It expired after 48 hours or was
already used. Open their page and press **Send the invite again**.

**A doctor never received the invite.** Check the SMTP tile on the control panel and
the "Emails queued and not sent" alert. On the demo machine, look in Mailpit.

**A doctor cannot sign in.** Check their status on their page. If deactivated, press
**Reactivate**. If still invited, press **Send the invite again**. If active, ask them
to use "Forgot your password?" on the doctor app. A password reset only works for an
active account. For an invited or deactivated account, the reset page sends nothing and
shows no error.

**The control panel shows the bot as Silent.** Nobody is being recruited. Check the bot
process is running on its host.

**Pressing a button on a doctor's page did nothing.** Resend invite, deactivate,
reactivate and remove seal do not show an error message if they fail. Reload the page
and check the status line. If it has not changed, check the control panel for an alert.

**"Not available. This account does not have access to this part of OBDM."**
You opened a page your account cannot use. Use the header links to go back.
