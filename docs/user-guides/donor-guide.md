# Donor guide: the OBDM donor app

This guide is for people who want to give blood. You talk to OBDM through a
chat in the donor app, which opens in your phone's browser. You do not need an account,
a password or any other app.

On the demo machine the donor app is at http://localhost:3004. On a real installation
the address is on the poster or in the message that sent you here.

**Two things to know before you start**

- The app is not a doctor. It does not decide whether you can give blood. The blood
  centre staff check you in person on the day, before any donation.
- You are never shown who the patient is. You only see the hospital, the blood group,
  how many units are needed and the date.

**Install it.** Open the address in your phone's browser and choose "Add to home
screen" or "Install app". It opens full screen like any other app. It still needs a
connection to send and receive messages. If you lose signal it says "You are offline";
nothing you said is lost, because the conversation is kept on the server.

**Your conversation belongs to this phone.** The app remembers you with a cookie in
this browser. If you clear the browser's data or move to a new phone, the app will not
know you and will ask you to register again. Your old registration stays on the list
until you delete it from the phone that made it, or ask the blood centre.

---

## 1. Registering (about one minute)

Open the app. It greets you straight away; you do not need to type anything first:

> Hello, and thank you for coming.
>
> We message people nearby when a patient needs blood.
>
> A few quick questions, about a minute. Nothing is saved until you say so at the end.

It then asks nine questions. Most are answered by tapping a button under the message.
The box at the bottom of the screen is for typing.

| # | Question | How to answer |
|---|---|---|
| 1 | Your phone number | Type it. See the note below. |
| 2 | Your name | Type it. |
| 3 | Your date of birth | Tap the year, then the month, then the day. You can also type it as `YYYY-MM-DD`. |
| 4 | Male or female | Tap **Female**, **Male** or **Other**. This only sets how long you wait between donations. |
| 5 | Your blood group | Tap one of the eight groups, or **I don't know**. Your best guess is fine. The centre tests every unit before it is used. |
| 6 | Roughly what you weigh | Tap a band: **Under 45**, **45–50**, **50–60**, **60–70** or **70+ kg**. |
| 7 | A few health questions | Tap **Yes** or **No** for each. |
| 8 | Where you live | Tap your district, then your city or taluk, then your town, then your locality. For long lists, type the first few letters and pick from the matches. |
| 9 | When you last gave blood | Tap **I have never donated**, **Within the last 3 months**, **3–6 months ago** or **More than 6 months ago**, or type the date as `YYYY-MM-DD`. |

**About your phone number.** Only the blood centre sees it, and only after you say yes
to a patient. Type the ten digits of your mobile number, for example `9847012345`.
Spaces and dashes are fine. The app adds India's country code for you. If you are
outside India, type the number with a plus sign and your country code.

A number typed into a web page cannot be checked by the app, so the blood centre is
told it is "not verified" and will confirm it with you when you arrive. Type it
carefully: it is the number the counter will ring.

**The health questions in step 7** are about long-term things only:

- Do you have a long-term illness, or take regular medicine for one?
- Have you ever been told you have an infection that can pass through blood?
- Are you pregnant or breastfeeding at the moment? (asked only if you answered Female)
- Has a doctor ever told you not to give blood?

Answer honestly. A "yes" does not remove you. It means the centre will have a word with
you before you are asked to give.

**Once you tap a button, that question is settled.** The button you chose shows a tick
and the others are greyed out. If you tapped the wrong one, you can fix it at the end.
See "Checking your answers".

**If you are under 18 or over 65**, the app says: "Thank you for offering. Blood
donation is for people aged 18 to 65, so please do come back when you are eligible."
It stays on the date of birth question in case the date was mistyped.

**If you type something the app does not understand**, it tells you what it needs, for
example "That does not look like a phone number. Ten digits, please." or "Please choose
one of the options." If the same question is refused twice, the app shows an example
of a right answer.

**Words that work while you are registering.** A message that is only one of these
words is treated as a command, not as an answer:

| Word | What it does during registration |
|---|---|
| `help` | Reminds you where you are and asks the question again |
| `start` or `resume` | Asks the current question again |
| `stop` | Discards your unfinished answers. Nothing was saved. Say hello to start again |
| `delete` | The same as stop. There is nothing saved to delete yet |

If your name or town is one of these words, type it with something else, for example
your full name.

Before you have registered, `stop`, `delete` and `pause` get "Nothing is saved about
you, so there is nothing to stop." and `help` explains what the app is. Any other
message starts registration.

**If you stop halfway**, your answers so far are kept for 48 hours so you can carry on.
Open the app again and send anything to continue from where you stopped. If the
question you stopped on has buttons, tap one of them. The app sends one reminder after
about six hours: "You started registering with OBDM and did not finish. Your
answers are still here." It never sends a second one.

### Checking your answers

At the end the app shows a numbered list of everything you said, like this:

```
Please check these details.

1  Phone: +9198••• ••210
2  Name: Anita
3  Date of birth: 1996-03-14  (age 30)
4  Sex: Female
5  Blood group: B+
6  Weight: 50–60
7  Screening answers: You told us:
      No long-term illness  ✓
      ...
8  Where you live: Kozhikode › Kozhikode › Feroke › Karuvanthiruthi
9  Last donated: Never donated
```

Your phone number is partly hidden so nobody reading over your shoulder can see it. If
you gave a last-donation date, row 9 also shows the date from which you can give again.

Under the list, the app explains what it will do if you agree:

- message you when someone near you needs your blood group
- share your name and number with the blood centre once you say yes to a particular
  patient
- keep what you told it

It also says: "You can pause, stop, or delete everything at any time." and "This is not
a medical check. The centre sees you on the day."

You get three buttons:

- **Yes, this is correct**. You are registered. The app will message you when you are
  needed.
- **Fix something**. Tap the rows that are wrong. The button under them reads **Fix
  these (2)** with the count of rows you ticked. Tap it, and the app asks only those
  questions again and shows the list once more. Tap **Cancel** to go back without
  changing anything. You can also type a row number, like `5`, to change one thing.
- **Not now**. Your details are saved but the app will not message you. The app says:
  "Send 'resume' whenever you want to be asked, nothing to fill in again."

Until you tap **Yes, this is correct** or **Not now**, you are not on the donor list.
Your answers are held only so you can finish, and are dropped after 48 hours.

### What the app says after you register

If you can be matched, you see:

> Thank you, Anita. You are registered.
>
> We will message you when someone near you needs your blood group.

If you gave blood recently, the second line ends with the date you become eligible, for
example "from 21 Jun onwards".

Sometimes you are registered but cannot be matched yet. The app tells you why:

| Reason | What the app says, in short |
|---|---|
| You do not know your blood group | The centre will type you at your first donation. You can walk in any time, and after that the app can match you. |
| Your weight is under 45 kg | Donors need to weigh at least 45 kg. The app will not ask you for now. You stay on the list. |
| A health answer needs checking | One of your health answers needs a quick check with the blood centre before the app asks you to give. "That is a conversation, not a no." |
| You gave blood recently | The app tells you the date from which you can give again. |

---

## 2. When someone needs blood

The app messages you when there is a real need you could answer. To be asked, you must
be registered and not paused or stopped, past your waiting time since your last
donation, inside the age and weight limits, with no health answer waiting to be
checked, and with a blood group that can be given to the patient. The app uses
compatibility, not only an exact match. For example, someone with O- blood may be asked
for a B+ patient.

The app asks the nearest people first, working outwards from the hospital's locality
to its town, city and district. It asks up to 20 people at a time. If the units are
still not covered after 30 minutes, it asks the next 20, and keeps going until the
need is met, withdrawn or past its date.

**The app does not ring or buzz on its own.** New messages appear when the app is
open, and the conversation refreshes itself every few seconds while you are looking at
it. Open it when you can, and check it if you know blood is being asked for.

The message looks like this:

> Someone at Government Medical College Blood Centre needs B+ blood by 11 Sep.
>
> Could you give?

You get two buttons: **Yes, I can give** and **Not this time**.

**If you tap "Not this time"**, the app says: "Thank you for letting us know. We will
ask again next time. Saying no now changes nothing." No reason is asked.

Once you have answered, the button you chose is marked with a tick and the other is
greyed out. Each request is offered to you once.

**If you tap "Yes, I can give"**, the app asks four short questions about today:

1. Are you feeling well today?
2. Have you eaten in the last four hours?
3. Have you taken antibiotics in the last week?
4. In the last six months, have you had surgery, a tattoo or a piercing?

These answers are about today only. They are not kept on your profile. If one answer
means today is not a good day, the app says so, and you can still give another time:

> Thank you for answering honestly.
>
> For this one it is better not to, but that is about today, not about you, and you
> can still give another time. The blood centre can talk it through if you would like.

### You are confirmed

If you pass the questions and a unit is still needed, you see:

> Thank you. The centre is expecting you.
>
> Government Medical College Blood Centre
> (the hospital address)
> By 11 Sep
>
> Please bring a photo ID. The centre will check you before you give.

This is the moment your name and phone number are shared with the blood centre, and
only with them. Go to the hospital blood centre with your photo ID.

### The waiting list

If enough people said yes just before you, the app puts you on a waiting list:

> Thank you for offering. Enough people have already said yes to this one, so you are
> on the waiting list. We will message you straight away if a place opens.

If a place opens, you get a message that starts "A place has opened up, if you can
still give." with the hospital address again. Please do not travel until you get that
message.

### If the need ends

If you were asked and had not yet answered, said yes, or were confirmed, the app tells
you how it ended. You may see one of these:

- "That B+ request is covered now. Enough people came forward. Nothing to do, and thank
  you for being there."
- "Thank you. You are no longer needed for that request." followed by the reason:
  enough people came forward, the hospital withdrew it, or the date has passed. The
  message ends with "Please do not travel for this one. We will ask you again next
  time."

If you tapped "Not this time", or the app asked you not to come today, you are not
messaged again about that request.

If you were already confirmed and a walk-in donor turns up at the counter, you are
still expected. The centre does not turn away someone who has said yes.

If you tap a button on an old message, the app says "You have already answered this
one, nothing more to do." or "That request has already ended. Thank you for coming
back to it."

---

## 3. After you donate

The counter staff record your donation. The app then thanks you and tells you the date
from which you can give again:

> Thank you. The centre has recorded your donation.
>
> You can give again from 21 Jun, and we will not ask before then.

The waiting time is 90 days if you answered Male, and 120 days if you answered Female
or Other. If the centre tested your blood group from the unit, that result replaces
what you told the app.

If you could not come, the centre records that too. The app says:

> The centre recorded that you could not come. That is completely fine, and we will ask
> again next time.

If you told the centre beforehand that you could not make it, it says:

> The centre recorded that you let them know you could not come. Thank you for telling
> them; your place has gone to the next person, and we will ask again next time.

Nothing is held against you either way.

---

## 4. The menu and the words you can type

Once you are registered, most replies carry a row of buttons: **What is needed now**,
**I want to give**, **My details**, **Pause messages** (or **Start again** while you are
paused) and **Help**. You can also type any of these words. The slash is optional.

| Word | Also works | What it does |
|---|---|---|
| `needs` | `board`, `requests` | Shows what is needed right now. |
| `donate` | `give` | Tells the app you would like to give. |
| `profile` | `edit` | Shows your details so you can check or change them. |
| `pause` | | Stops messages for 90 days. |
| `resume` | `start` | Starts messages again, after a pause, a stop or "Not now". |
| `stop` | | Stops all messages. You can come back with `resume`. |
| `help` | `menu` | Shows the list of words. |
| `delete` | | Deletes everything about you. See section 6. There is no button for this one. Type it. |

The help message ends with: "We do not give medical advice. The blood centre checks
you on the day."

If you type anything else, the app tells you where you stand: what is open, or why it
is quiet for you.

### The needs board

Type `needs` or tap **What is needed now** to see open requests:

```
3 patients need blood right now.

● B+: 2 units still needed by 11 Sep
   Government Medical College Blood Centre
   You can give for this one.
○ O−: 1 unit still needed by 12 Sep
   Beach Hospital

● you can give   ○ a different group

Tap one you can give for, and I will ask you a few questions.
```

A filled dot means you can give for that one. The board lists requests from every
hospital, not only those near you, and shows at most ten, soonest first.

Under the board is one button for each request you can give for, labelled with the
group and the hospital, for example **Give B+: Government Medical College Blood
Centre**. Tapping it shows you that request's message with **Yes, I can give** and
**Not this time**, exactly as in section 2. If you say yes, the four questions follow.

If you are paused, inside your waiting time, or have a health answer waiting to be
checked, the board shows the reason instead of the Give buttons.

You can look at the board before registering. It then ends with: "Send anything to
register. It takes about a minute, and then we can tell you which of these you could
give for."

### "I want to give"

Type `donate` or tap **I want to give** when there is nothing open. The app says:
"Thank you. We have noted that you would like to give." and reminds you that you are in
the pool and that the centre takes walk-in donors during opening hours. You do not have
to wait for a message.

If you cannot be asked right now, for example because you are paused or inside your
waiting time, the app notes your offer and tells you the reason instead.

### Links from posters and messages

You may receive a link like `http://localhost:3004/r/BC-ABCD2345` (with the real
address in place of the demo one). It opens the app straight on that request. If you
are not registered yet, the app says "Let us get you registered first", takes you
through the questions, and then says "Now, back to why you came" and shows the request.
If the request has already been answered by the time you arrive, the app says so and
shows the needs board instead.

---

## 5. Changing your details

Type `profile` or tap **My details**. The app shows the same numbered list as at
sign-up, with the same three buttons.

- Tap **Fix something**, tick the rows to change, and tap **Fix these**. When you save,
  the app says "Saved. Thank you for keeping it up to date." Saving counts as agreeing
  again to the app's messages.
- Tap **Yes, this is correct** to leave everything as it is.
- Tap **Not now** and the app stops messaging you, the same as at sign-up. Type
  `resume` to be asked again.

Notes:

- Changing your district asks for your city, town and locality again.
- Changing the health answers asks the whole short set again.
- If you type a command such as `stop`, `pause` or `needs` part-way through a change,
  the app says "Your unfinished change was not saved." and then does what you asked.
  Type `help` to be reminded where you are without losing the change.

---

## 6. Pausing, stopping and deleting

**Pause** stops messages for 90 days. The app says: "Of course. We will not ask again
until 21 Dec." Type `resume` to come back sooner.

**Stop** stops all messages. The app says: "Done. We will not contact you again." and
"Thank you for the time you gave. Say hello any time if you change your mind." Your
details stay, so you can type `resume` and be asked again without filling anything in.

**Resume** brings you back. The app says: "Welcome back. We will ask you again when
someone nearby needs your blood group."

**Delete** removes everything the app knows about you. It asks first:

> This permanently deletes your name, number and everything you told us, and cannot be
> undone. Donations you already made stay with the blood centre without your name,
> because the law requires it.
>
> Delete everything?

Tap **Yes, delete everything** or **No, keep my details**. If you keep them, the app
says "Nothing was deleted."

After deleting, your name, phone number, health answers, location, this conversation
and the link to this phone are gone. The app can no longer reach you. If you donated
before, the app tells you how many donations stay on the blood centre's record. Those
records keep the unit number, the date and the tested blood group, with your name
replaced by "Deleted donor". The law requires a unit to be traceable, so those rows
cannot be removed.

---

## 7. Your privacy

- Your phone number is shared with the blood centre only after you say yes to a
  specific request and pass the four questions. Before that, nobody at the hospital
  sees it.
- Your number is partly hidden on every screen the app shows you.
- You are never told a patient's name, ward or diagnosis.
- The app never offers money or gifts for blood. Donation is voluntary.
- The app does not give medical advice. The blood centre checks you on the day.
- The conversation is kept on the server, not in your browser, and is deleted with
  everything else when you ask for deletion.

---

## 8. Quick questions

**Do I need to sign in or type a command?** No. Open the app and it greets you.

**Does the app message me at night?** There are no quiet hours, but the app does not
ring or buzz; messages wait for you to open it. If you do not want messages for a
while, use **Pause messages**.

**Will I be asked twice about the same request?** No. Each request is offered to you
once.

**How many people are asked?** Up to 20 people at a time, nearest first. If the units
are still not covered after 30 minutes, the next 20 are asked, and so on until the need
is met.

**I said "Not this time". Am I in trouble?** No. Saying no changes nothing.

**I do not know my blood group. Can I still register?** Yes. Walk in to the blood
centre any time. They test the unit they collect, and after that the app can match you.

**I chose "Within the last 3 months" but it was nearly three months ago.** The app
takes the safe reading and counts from today, so you will not be asked for the full
waiting time. If you know the date, type it instead. You can also fix it later with
`profile`.

**I got a new phone.** The app will not know you. Register again on the new phone, and
from the old one type `delete` if you still have it, so there is one of you on the
list. Otherwise ask the blood centre to remove the old entry.

**Something went wrong with the app.** Type `help` to see the menu. If the app does
not answer at all, or shows "Could not reach OBDM", check your connection and
try again. If it still does not answer, contact the hospital blood centre directly.
