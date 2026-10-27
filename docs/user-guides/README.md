# OBDM user guides

OBDM, Open Blood Donation Management, helps a hospital get blood to a patient. A doctor asks for blood. The
blood centre answers from the fridge. If the fridge cannot cover it, a chat bot asks
nearby donors to come in. Everyone who was asked is told how it ended.

There is one guide for each kind of user. Pick yours.

| You are | Read | You use |
|---|---|---|
| A doctor on a ward | [Doctor guide](doctor-guide.md) | The doctor app |
| Blood centre staff at the counter or the fridge | [Blood centre guide](blood-centre-guide.md) | The blood centre app |
| An administrator who manages doctor accounts | [Administrator guide](administrator-guide.md) | The administration app |
| A volunteer admin who spreads the word | [Volunteer admin guide](volunteer-admin-guide.md) | The volunteer app |
| Someone who wants to give blood | [Donor guide](donor-guide.md) | The donor app, a chat in the browser, no account needed |
| A member of the public with a link | [Public board guide](public-board-guide.md) | The public board, no account needed |

Each guide is written to be read on its own. You do not need to read the others.

## How the pieces fit together

1. **The doctor** fills in four things: blood group, product, how many units, and how
   urgent. The app gives them a short ID. The doctor reads the ID to the patient's
   bystander.
2. **The bystander** takes the ID to the blood centre counter.
3. **The blood centre** types the ID, takes the patient's details from the bystander,
   and issues units from the shelf. Whatever the shelf cannot cover becomes a "demand"
   for donors. This happens only for whole blood and red cells. Platelets, plasma and
   cryoprecipitate are prepared in a lab.
4. **The chat bot** messages nearby registered donors. Those who say yes answer a few
   questions and are told where to go.
5. **The blood centre** records each donor at the counter. The bot thanks them and
   tells everyone else who said yes that they are no longer needed.
6. **Volunteer admins** and the public see how much is still needed, by blood group,
   and help spread the word.

## Where to find each app

Each kind of user has their own app with its own sign-in page. Your account only works
in your own app. If you try to sign in to the wrong one, it says "Email or password is
incorrect." Each sign-in page has links to the other apps.

| App | Address on the demo machine |
|---|---|
| Doctor app | http://localhost:3000 |
| Administration app | http://localhost:3001 |
| Blood centre app | http://localhost:3002 |
| Volunteer app | http://localhost:3003 |
| Public demand board | http://localhost:3003/board |
| Donor app (the chat) | http://localhost:3004 |

On a real installation the addresses will be different. Ask your administrator.

## Things every staff user should know

**You cannot sign up yourself.** An administrator creates your account. You get an
email with a link. Open the link, choose a password of at least 6 characters, and you
are signed in. The link works once and expires after 48 hours.

**Forgot your password?** Press "Forgot your password?" on the sign-in page of the
doctor, blood centre or volunteer app. Enter your email and press **Send me a code**. A
six-digit code arrives by email and is valid for ten minutes. Enter your email, the
code and a new password under **I have a code**. This signs you in and signs you out
everywhere else. Administrators use one of the staff apps' reset pages, because the
administration app does not have its own. The administrator guide explains this.

**Your session lasts 12 hours.** After that, sign in again. You are returned to the
page you were on.

**Too many wrong sign-in attempts** lock the account for a few minutes. The message
tells you how long to wait.

**Use it on your phone.** Open the app in your phone's browser and choose "Add to home
screen" or "Install app". It opens full screen. It still needs a connection. If you
lose signal, it shows "You are offline" rather than old information, because an old
stock figure is a wrong stock figure.

**Not a medical device.** The system does not make clinical decisions. The donor check
and the compatibility test always happen on site, with a person. Every page says so in
its footer.

**Demo accounts.** On the demo machine, four accounts exist with the password
`OBDM!Demo2026`. They are `doctor@`, `admin@`, `centre@` and `volunteer@`, all
at `obdm.invalid`. Nothing in the demo is real. On the demo machine, all email
lands in Mailpit at http://localhost:8025.
