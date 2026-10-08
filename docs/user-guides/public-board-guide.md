# Public board guide

This guide is for anyone who has been sent a link to the Blood Connect demand board.
You do not need an account. The board shows which blood groups a hospital needs right
now, and where to go.

On the demo machine the board is at http://localhost:3003/board. On a real installation
the address is the one at the end of the message you received.

---

## 1. What the board shows

The page is titled **Where blood is needed**. Under the title it says: "Open donor
demand, by blood group and town. Counts and hospitals only. No patient and no donor
appears on this page."

At the top is a row of chips, one per blood group with units needed, for example
"A+ 7" and "O- 3". Groups with nothing outstanding have no chip.

Under the chips is one table, soonest first:

| Column | Meaning |
|---|---|
| Group | The blood group needed |
| Hospital | The hospital blood centre to go to |
| Town | The hospital's town, or "Not given" |
| Units needed | How many units are still needed |
| Needed by | The date |

Needs that are already covered are left off, so everything on the board is still open.

The only instruction on the page is:

> If you would like to donate, go to the hospital blood centre. Eligibility is assessed
> there, before any donation, by the centre staff.

The board refreshes itself every two minutes.

The page has a **Sign in** button in its header. That is for hospital staff and
volunteer admins. You do not need it.

---

## 2. What the board does not show

- No patient's name, ward or condition.
- No doctor.
- No donor, and no count of who has been asked.
- No link to the Telegram chat bot. If you want the bot, it is on Telegram as
  `cmck_blood_donor_bot`, or on the poster or message that sent you here.

---

## 3. Two messages you may see instead of the table

**"This board is not published yet. Ask the blood centre what is needed."** The board
has not been switched on for this installation. Contact the hospital blood centre
directly.

**"Nothing is outstanding right now. Thank you to everyone who came in."** Everything
is covered. You can still walk in to donate during the centre's opening hours.

---

## 4. If you want to give blood

1. Check the board for your blood group. If you do not know your group, you can still
   go. The centre tests every unit it collects.
2. Go to the hospital blood centre named on the board, during its opening hours.
3. Bring a photo ID.
4. The centre staff check whether you can give on the day. The board and the chat bot do
   not make that decision.

If you would rather be messaged when your blood group is needed, register with the chat
bot. The [donor guide](donor-guide.md) explains how.
