# Doctor guide

This guide is for doctors who need blood for a patient.

Your part is short. You answer four questions, the app gives you an ID, and you give the
ID to the patient's bystander. The blood centre does everything else.

On the demo machine the doctor app is at http://localhost:3000. On a real installation
the address will be different. Ask your administrator.

---

## 1. Signing in for the first time

You cannot create your own account. An administrator creates it for you. You get an
email with the subject "Set up your Blood Connect account".

1. Open the link in the email.
2. Choose a password. It needs at least 6 characters. A phrase you can remember is
   better than a short, complicated one.
3. Press **Set password and sign in**. You land on your dashboard.

The link works once and expires after 48 hours. If you see "This link has expired or
has already been used. Ask for a new one.", ask your administrator to send a new invite.

**After that**, open the doctor app and press **Sign in**. Enter your email and
password. Your session lasts 12 hours. When it ends you are sent back to the sign-in
page, and after signing in you return to the page you were on.

The sign-in page says "For doctors". If you are blood centre staff or a volunteer admin,
use the links under the form to reach your own app.

If you see "Email or password is incorrect.", check both. The same message appears if
your account has been deactivated, or if you are on another app's sign-in page. After
too many wrong tries you see "Too many attempts. Try again in N minutes." Wait, then
try again.

---

## 2. Your dashboard

The dashboard is titled **Blood requests**. Under the title it says: "Four answers and
an ID. Give the ID to the patient's bystander. The blood centre takes it from there."

The page has two lists.

**Submitted requests.** Every request you have raised. The list is ordered by the most
recent change, so a request the centre has just answered moves to the top. Each row
shows:

| Column | What it shows |
|---|---|
| Request ID | The ID you gave the bystander, for example `090926-00001` |
| Urgency | Emergency, Very urgent, Urgent or Routine |
| Wanted | Units, product and blood group, for example `2 × PRBC A+` |
| Patient | The patient's name, or "with the bystander" until the centre records the patient |
| Status | Submitted, Approved, Partly approved, Declined or Cancelled |

A submitted request that has passed the date the blood was needed shows a red
**Overdue** badge after its status.

When you have not raised anything yet, the list says "Nothing submitted yet."

**Admitted patients.** Patients with an open admission at the hospital. This list is
not limited to your own patients. Each row has a **New request** button that starts a
request with that patient already attached. Most of the time you will use the large
**New request** button at the top of the page instead.

The dashboard does not refresh on its own. Reload the page to see a change in status.

---

## 3. Raising a request

Press **New request**. The page is titled **New blood request**. It asks four
questions:

| Question | Choices |
|---|---|
| **Requested blood group** | O-, O+, A-, A+, B-, B+, AB-, AB+ |
| **Product** | Whole Blood, Packed Red Blood Cells (PRBC), Platelet Concentrate (RDP / SDP), Fresh Frozen Plasma (FFP), Cryoprecipitate |
| **Units** | 1, 2, 3, 4, or **5+** to type a larger number |
| **How urgent?** | Emergency, now · Very urgent, within hours · Urgent, today · Routine, this week |

Packed Red Blood Cells is selected for you. Choose the other three yourself.

**Choose the product carefully.** Whole blood, red cells, platelets, plasma and
cryoprecipitate are not interchangeable. The centre issues exactly what you ask for.

**Urgency sets the date.** You do not type a date. The system works it out from the
urgency:

| Urgency | Date required | The centre is asked to answer within |
|---|---|---|
| Emergency, now | Today | 15 minutes |
| Very urgent, within hours | Today | 1 hour |
| Urgent, today | Today | 4 hours |
| Routine, this week | 7 days from today | Answered in the order the queue reaches it |

Three of the four mean "today". The difference is how quickly the centre is asked to
act. The centre's queue is sorted by urgency, so an emergency raised this morning sits
above a routine request raised days ago.

**The section "Patient and clinical details" is optional.** It is closed by default and
says "Optional, the blood centre fills these in". The centre collects these details
from the bystander at the counter. Leave the section closed unless you already have the
details to hand.

If you do open it, you can enter: indication for transfusion, patient name, IP number,
ward number, patient's own blood group, age and age unit (years, months or days), sex,
hospital ID, attender name and phone, known diagnosis, and relevant history.

If you type a patient name, three more fields become required: the IP number, the
patient's own blood group, and the age. If any is missing, the form will not save and
tells you which one to fill in.

If you started from an admitted patient, this section is already open and shows the
patient's name, and only the indication is left to fill in.

Press **Send to the blood centre**. There is no review screen and no draft. The request
is sent at once. Press **Cancel** at the bottom of the form to leave without sending.

If one of the four answers is missing, a message at the top of the form tells you which
one, for example "Choose a blood group.", "Choose a product." or "At least one unit."

---

## 4. The ID, and what to do with it

After sending, you land on the request page. At the top is a card that says **Give
this to the patient's bystander**, followed by a large ID, like this:

```
090926-00001
```

The ID is the date (day, month, year) and a number that restarts every day.

Beside the ID is the urgency and how quickly the centre is asked to answer. Under it,
the card says: "They take it to the blood centre, who will ask them for the patient's
details. Nothing else is needed from you."

**Read the ID aloud to the bystander**, or show them the screen. They take it to the
blood centre counter. The counter types in the ID, asks the bystander for the patient's
name, IP number and other details, and then answers the request from stock.

This card is shown only when you arrive on the page straight after sending. If you open
the request later, the ID is shown as the page heading instead.

The ID identifies the request. It does not prove who anyone is, which is why there is
no public "track your request" page. The bystander is checked in person at the counter.

**Emergency requests** are the one exception to "patient first". The centre may issue
units for an emergency before the bystander arrives. For every other urgency, the
centre waits for the patient's details before issuing anything.

---

## 5. Checking on a request

Click a request ID on the dashboard to open it. The status line under the heading tells
you where the request is:

| Status | What it means |
|---|---|
| Submitted, waiting for the blood centre | Nothing has been decided yet |
| Approved | Every unit you asked for was issued |
| Partly approved | Some units were issued |
| Declined | Nothing was issued. Raise a new request if you still need blood |
| Cancelled | You cancelled it |

Beside the status is the urgency and the time the centre is asked to answer within.

The page has these cards:

**What was asked for.** Product, units, requested blood group, priority, the date
required, and the indication for transfusion.

**Patient, as recorded at submit.** Once the counter records the patient, their name,
IP number and ward appear here, along with your name and registration number as
"Requested by". This is a snapshot. Editing the patient record later does not change
what the request shows.

**What the blood centre answered.** Appears once the centre has decided. It shows how
many units were issued out of how many you asked for, plus any note from the centre.
If the centre is recruiting donors for the shortfall, it says "Donors are being asked
for the units the shelf could not cover." Donors are recruited only for whole blood and
red cells. Platelets, plasma and cryoprecipitate are prepared in a lab, so a shortfall
in those does not recruit anyone. You do not see a donor list or a live count.

**Nobody notifies you** when a request is answered. There is no email, push
notification or alert. Open the dashboard and look.

---

## 6. Cancelling a request

Cancel a request if the patient improved, died, was referred, or the request was raised
in error.

1. Open the request.
2. Scroll to the card **No longer needed?** and press **Cancel this request**.
3. Answer **Why is it being cancelled?** The blood centre reads this reason.
4. Press **Cancel the request**. Or press **Keep it** to change your mind.

The page tells you what will happen before you confirm. If the centre has already
answered, any units it is holding go back on the shelf, and every donor who agreed to
give is told not to travel. If the centre has not yet answered, it stops working on the
request, and every donor who agreed to give is told not to travel.

After cancelling, the page shows "Cancelled:" followed by your reason.

Units that have already been issued and have left the fridge are not affected by a
cancellation. Only units still held for the request go back on the shelf.

You can cancel a request that is submitted, approved or partly approved. You cannot
cancel a declined request, because there is nothing left to cancel. A cancelled request
cannot be reopened. Raise a new one.

You cannot edit a request after sending it. If you chose the wrong group, product,
units or urgency, cancel it and raise a new one. You can only cancel your own requests.

---

## 7. Recording a compatibility testing sample

On the request page there is a card called **Pre-transfusion compatibility testing
sample**. Use it when a sample tube is drawn for cross-matching.

1. Type the **Sample identifier** exactly as printed on the tube.
2. Leave **Collected at** blank for "now", or set the time. A time in the future is
   refused.
3. Add a note if you want. It is optional.
4. Press **Record the sample**.

The identifier must be unique across the whole hospital. If it is already recorded, the
form says so and asks you to check the tube in your hand against the label. You can
record more than one sample against a request. Recorded samples are listed under the
form, newest first, with the identifier, time, who recorded it, and the note.

You can record samples only against your own requests. The form disappears once a
request is cancelled.

---

## 8. Patients and admissions (optional)

Blood Connect can hold patient and admission records, but you do not need them to raise
a request. The blood centre records the patient from the bystander in the normal flow.

If your hospital uses these records:

**Record a patient.** Open `/patients/new` in the doctor app. There is no button for
this on the dashboard, so type the address or save it as a bookmark. The page is titled
**Record a patient**. Fill in the patient's name, date of birth or age, sex, blood group,
hospital ID, attender name and phone, address, diagnosis, history and previous
transfusion. If the patient had a previous transfusion, a field for any reaction
appears. Press **Save patient and admit**.

When you type a name, the form checks for patients with a similar name and lists them.
It says: "If one of these is the same person, use their existing record. If not, carry
on. This is only a check."

**Admit the patient.** After saving, you are taken to **Admit the patient**. Enter the
IP number and the ward number. The IP number identifies the admission and cannot be
changed afterwards. Leave "Admitted at" blank for "now". Press **Create admission**.

**Open an admission** from the dashboard to see the patient's age, hospital ID,
diagnosis and previous transfusion. From there, press **New request** to start a
request with the patient attached, or **Discharge** when the patient leaves the ward.
The Discharge button is only on the admission page, and only while the patient is
admitted.

---

## 9. Your account

Click your name at the top right to open **Your profile**.

**Your details.** Your name, email and registration number. Registration shows "Not
recorded" if none was entered.

**Change your email address.** Type the new address and press **Send the
confirmation**. A link is sent to the new address. The page says: "Check the new address
for a confirmation link. Your account keeps its current address until you open it." The
old address is also told, so you will know if someone else tried to change it. While
the change is waiting, the profile shows the new address with a **Cancel this change**
button. When you open the link, the page says "Address changed" and you sign in with
the new address from then on.

**Change your password.** Press **Change password**. This opens the same page as a
password reset. Enter your email under **Send me a code** and press the button. A
six-digit code arrives by email and is valid for ten minutes. Then, under **I have a
code**, enter your email, the code and a new password, and press **Set the new
password**. This signs you in and ends every other session.

**Change your name or registration number.** These appear on every request you raise,
so an administrator has to agree. In the card **Ask to change your name or
registration**, choose **Full name** or **Registration number**, type what it should
say and why, and press **Send the request**. The profile then shows "Waiting on your
administrator" with a **Withdraw it** button. Once decided, the profile shows either
the new value or that it was not changed, with the administrator's note if they left
one.

**Sign out** with the button at the top right.

---

## 10. Using it on your phone

Open the doctor app in your phone's browser and choose **Add to home screen** or
**Install app**. It opens full screen like an app.

It still needs a connection. If you lose signal, it shows "You are offline" rather than
old information, because an old status is a wrong status. Reconnect and reload the
page.

---

## 11. Common problems

**"Email or password is incorrect."** Check both. Make sure you are on the doctor app's
sign-in page, not the blood centre or volunteer one. If you still cannot sign in, press
"Forgot your password?" and follow the steps in section 9 under "Change your password".

**"Too many attempts. Try again in N minutes."** Wait for the time shown and try again.

**"Not available. This account does not have access to this part of Blood Connect."**
You opened a page your account cannot use. Go back to the dashboard.

**The request does not show a patient.** The bystander has not reached the counter yet,
or the counter has not recorded the patient yet. Nothing is wrong.

**I sent the wrong details.** Cancel the request with a reason and raise a new one.

**My request was declined.** Read the centre's note on the request page. A decline is
an answer, not something you can edit. If you still need blood, raise a new request.

**My request was partly approved and nothing says donors are being asked.** Donors are
recruited only for whole blood and red cells. For platelets, plasma and cryoprecipitate,
the centre prepares the rest in the lab or asks you to raise a new request later.

**My session ended.** Sessions last 12 hours. Sign in again. You are returned to the
page you were on.
