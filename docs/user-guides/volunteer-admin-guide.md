# Volunteer admin guide

This guide is for volunteer admins. You help spread the word when a hospital needs
blood. Your app shows how much of each blood group is still needed, and gives you a
ready-made message to forward. It never shows you a patient, a doctor or a donor.

You cannot change anything about blood demand from this app. The only thing that leaves
the app is the message you copy. The only things you can change are your own account
details.

On the demo machine the volunteer app is at http://localhost:3003. On a real
installation the address will be different. Ask your administrator.

---

## 1. Signing in

You cannot create your own account. An administrator creates it and you get an email
with a link. Open the link, choose a password of at least 6 characters, and press **Set
password and sign in**. You land on your dashboard.

After that, open the volunteer app and press **Sign in**. Use your email and password.
Your session lasts 12 hours.

The sign-in page says "For volunteer admins". If you are a doctor or blood centre
staff, use the links under the form to reach your own app.

If you see "Email or password is incorrect.", check both, and check that you are on the
volunteer app's sign-in page. After too many wrong tries you see "Too many attempts.
Try again in N minutes."

The landing page of the app, before you sign in, has two buttons: **Sign in** and
**Open demand board**. The second opens the public board described in the
[public board guide](public-board-guide.md).

---

## 2. The dashboard: where blood is needed

The dashboard is titled **Where blood is needed**. Under the title it says: "Counts and
hospitals. No patient, no doctor and no donor appears on this screen."

If your account is limited to one district, the same line ends with "Showing your
district only." You cannot widen this yourself. Ask your administrator.

The page refreshes itself every minute while the tab is in front of you. A tab left in
the background does not refresh, but it refreshes as soon as you return to it.

### The eight tiles

There is one tile for every blood group, always all eight, in this order: A+, A-, B+,
B-, AB+, AB-, O+, O-. A quiet group still gets a tile, so you never wonder whether a
group is covered or just missing.

Each tile shows the group, the number of units still needed, a word for its state, and a
short note. The colour is a hint. The word is the fact. A legend under the tiles lists
the four words.

| Word on the tile | Colour | What it means | What to do |
|---|---|---|---|
| **Covered** | Green | Nothing is outstanding and the shelf is fine | Nothing. Move on to another group |
| **Donors coming** | Yellow | Units are outstanding, and at least half are promised | Keep it moving |
| **Needs donors** | Orange | Units are outstanding, and between one in five and half are promised. Or nothing is outstanding, but the centre's shelf is below its floor | Post it today |
| **Nobody yet** | Red | Units are outstanding, and fewer than one in five are promised | Post it now, and ring people |

The note under the number reads one of: "Nothing outstanding", "Shelf below floor",
"12 messaged", or "3 confirmed · 12 messaged".

- **Messaged** is how many donors the chat bot has asked.
- **Confirmed** is how many units donors have promised. It counts units, not people.

A group is never green while the blood centre says its shelf is below the floor, even
when no request is open. A low shelf is a today job, not a now job. Once units are
outstanding, the word is decided by how many are promised, and the shelf is not
considered.

Until you choose a group, a message says: "Choose a group above to see what is open
behind it, and the message to forward."

### Opening a group

Tap a tile. A card called **Open for B+** (or whichever group) appears with a table of
every open need for that group, soonest first:

| Column | Meaning |
|---|---|
| Hospital | Where to go. It may say "· shelf below floor" after the name |
| Town | The hospital's town, or "-" for a shelf-floor need |
| Still needed | Units not yet promised |
| Confirmed | Units donors have promised |
| Messaged | Donors the bot has asked |
| Needed by | The date |

If nothing is open, it says "Nothing open for B+ right now. Thank you. Please keep the
group ready."

Press **Clear** to go back to the tiles.

---

## 3. The message to forward

Under the table is a box called **Message to forward**. The system writes it from the
live numbers each time the page loads. You cannot edit it. This is on purpose: nothing
unreviewed goes out under the hospital's name, and the message can never be out of date
when you copy it.

It looks like this:

```
B+ blood needed: 7 units.
• Government Medical College Blood Centre, Kozhikode: 4 units by 5 Oct
• Beach Hospital, Kozhikode: 3 units by 6 Oct
If you are eligible and free, please go to the hospital blood centre.
http://localhost:3003/board
```

The last line is the link to the public board. The town is left out when it is already
part of the hospital's name.

Press **Copy the message**. It says "Copied." Paste it into WhatsApp, a group chat, a
notice or wherever your people are.

If copying does not work on your phone, it says "Could not copy. Select the text and
copy it." The text is in a plain box, so you can select it by hand.

When nothing is outstanding, the message is one line: "B+ blood: nothing outstanding
right now. Thank you. Please keep the group ready." followed by the board link.

---

## 4. The six-week trend

Under the message is a small table called **Last six weeks**. For the chosen group it
shows, week by week, the columns **Week of**, **Needed** and **Met**, with a bar showing
the share met. Use it to see whether a group is often short or only this week.

Some things to know when reading it:

- The week is shown as a date, for example 2026-09-21.
- It counts every demand dated in the window, whatever its current status, so it can
  differ from the tiles above it.
- Demands dated in the coming days appear too, since the window has no upper limit.
- Weeks with nothing in them are left out rather than shown as zero.
- If there is nothing at all, it says "No history for B+ in the last six weeks."

---

## 5. Your account

Click your name at the top right to open **Your profile**.

**Your details.** Your name, email and registration number. Registration shows "Not
recorded" if none was entered.

**Change your email address.** Type the new one and press **Send the confirmation**. A
link goes to the new address. Your account keeps the old address until you open the
link. While the change is waiting, the profile shows it with a **Cancel this change**
button.

**Change your password.** Press **Change password**. This opens the reset page. Under
**Send me a code**, enter your email and press the button. A six-digit code arrives by
email and is valid for ten minutes. Then under **I have a code**, enter your email, the
code and a new password, and press **Set the new password**. This signs you in and
ends every other session.

**Change your name or registration.** An administrator has to agree. In the card **Ask
to change your name or registration**, choose **Full name** or **Registration number**,
type what it should say and why, and press **Send the request**. The profile then shows
"Waiting on your administrator" with a **Withdraw it** button. Once decided, it shows
the new value, or that it was not changed and the administrator's note.

The profile says your name and registration number appear on every request you raise.
This text is shared with the doctor app. As a volunteer admin you do not raise requests,
but the same rule applies: an administrator agrees to the change first.

**Sign out** with the button at the top right.

---

## 6. The public board

The link at the end of every message you forward opens the public board. Anyone can
open it, with no account. It shows the same needs as your dashboard, without the
messaged and confirmed counts. The [public board guide](public-board-guide.md)
describes it.

Two states are worth knowing about, because people may ask you about them:

- "This board is not published yet. Ask the blood centre what is needed." The board has
  not been switched on for this installation. There is no button for this in any app.
  It is a configuration value that the people who run the system set. Ask your
  administrator.
- "Nothing is outstanding right now. Thank you to everyone who came in." Everything is
  covered.

The board does not link to the Telegram bot. Donors who want the bot can find it on
Telegram as `cmck_blood_donor_bot`, or from a poster or message that carries its link.

---

## 7. Using it on your phone

Open the volunteer app in your phone's browser and choose **Add to home screen** or
**Install app**. It opens full screen. It still needs a connection. If you lose signal
it shows "You are offline". Reconnect and reload the page.

---

## 8. Common problems

**I cannot see a district I know has a need.** Your account may be limited to one
district. Ask your administrator.

**The tile says "Needs donors" but the table is empty apart from a shelf-floor row.**
This is expected. The centre's shelf is below its floor for that group, and the centre
has asked for donors even though no patient is waiting.

**The six-week table does not match the tiles.** The table counts every demand in the
window, including closed ones and ones dated in the coming days. The tiles show only
what is open now.

**"Not available."** You opened a page your account cannot use. Go back to the
dashboard.

**My session ended.** Sessions last 12 hours. Sign in again.
