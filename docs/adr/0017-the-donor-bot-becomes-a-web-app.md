# ADR 0017: The donor bot becomes a web application

Date: 2026-10-09 · Status: accepted · Extends ADR 0006, ADR 0016

The donor bot talked to people through Telegram. It now talks to them through
a web application of its own, `apps/donor` on :3004, installable to a phone's
home screen like the staff applications and presenting the same conversation
as a chat screen. The Telegram adapter and the separate bot process are gone.

---

## 1. Why

Three things, in the order they were felt.

**Telegram was a dependency on the donor's side, not only ours.** Every donor
needed the app, an account and a phone number registered with Telegram before
they could say hello. A poster in a hospital corridor that ends in "install
Telegram first" loses most of the people who read it. A link that opens a page
loses far fewer.

**It was a dependency on ours too.** A bot token from @BotFather, a host that
can reach `api.telegram.org`, and a platform whose availability and policy are
not the hospital's to decide (§10 already required the system to be
demonstrable without it). The demo plan carried a recording of the phone
screen in case Telegram was unreachable on the day.

**The channel was always meant to be swappable (§2.11).** The port was written
so that no platform type appears above the adapter, and ADR 0006 §8 recorded
the lesson that a second real channel is what makes the first one's assumptions
visible. This is that second channel, and the conversation, the interview, the
waves, the outbox and the stand-down guarantee did not change for it.

## 2. What the web channel is

`packages/bot/src/adapters/web.ts`. A chat platform holds the conversation on
the donor's behalf; a browser holds nothing, so the adapter is the platform:

- **Sending is writing a row.** `bot.chat_messages` (bot migration 0004) holds
  one row per message in either direction, keyed by the same
  `(channel, channel_user_id)` pair every other table uses for a person. The
  outbox drain calls `send`, `send` inserts the row, and the message is on the
  transcript at exactly the moment it counts as sent. The browser reads its own
  rows back, in order, and that is the whole screen.
- **Editing in place is supported.** `replaces` with `editChoicesOnly` is an
  UPDATE of the row an earlier send returned, so an answered question locks
  its buttons (§8) without a second copy of the question. The address is part
  of the match: a reference from one person's transcript cannot rewrite a row
  on another's.
- **It receives nothing.** Updates arrive over HTTP and are handed to the
  router directly. `receive` resolves empty so the port stays whole.
- **It cannot vouch for a phone number.** `requestContact` was always a hint an
  adapter may ignore, and this one does. The number is recorded as typed and
  unverified, which is the fallback the interview was written for (§5, step
  1), and the counter's roster still says so.

## 3. Who a donor is

A platform hands the bot a user id it vouches for. The web hands it nothing, so
the application issues one: 32 random bytes in an `httpOnly`, `sameSite=lax`
cookie (`bc_donor_chat`), renewed on every call, and the channel user id is
the token's SHA-256. The database holds the hash and never the bearer, the
same arrangement the staff sessions use.

**A person is their device.** Clear the cookie, or change phones, and the bot
meets a stranger who registers again. Linking the two is the verified phone
number's job (§2.11), and the web cannot verify one. That is the cost of this
decision and it is named rather than hidden: it stays open until a channel
that can verify a number is added, or an OTP by SMS, which this system has no
provider for.

Nothing in a request body can say who the person is. The address comes from
the cookie, resolved on the server, or it does not exist (§2.5, §13). A
mutating request must also be same-origin; a missing `Origin` is refused.

## 4. The process folded into the application

ADR 0006 made `packages/bot` the package and `apps/bot` the process, with two
loops: one long-polling the platform, one ticking. The web channel has no poll
to run, so what is left is the ticker, and it runs inside the Next server,
started once from `instrumentation.ts`. Replies to a tap are drained inside
the request that caused them, which is what the old conversation loop did
after ADR 0006 §10 found the fifteen-second wait.

The boot checks are unchanged in substance: a contract-version mismatch or an
unreachable database refuses to start rather than serving a chat that
silently recruits nobody (§6, §13). The error now prints the cause as well as
the message, because `String(error)` dropped the `ECONNREFUSED` that explained
a stopped Docker stack more than once.

What this does not change: the application connects as `app_bot` and nothing
else. A new boundary rule, `the-donor-app-is-the-bot-side`, keeps `platform`,
`hospital`, `centre`, `volunteer`, `ops` and `staff-web` out of it, so the two
deployables stay two and the donor register has no path to a patient (§5.1).

## 5. Request links

`https://t.me/<bot>?start=BC-ABCD2345` becomes `<donor app>/r/BC-ABCD2345`. The
page redirects to the chat with the id in hand, the chat posts it as the same
`start <id>` payload the router always understood, and the link is consumed
once so a reload does not reopen the request. "The link is never lost" (§5)
holds exactly as before: a visitor is onboarded first and brought back to the
request, written onto the draft.

## 6. Erasure reaches the transcript

The transcript's incoming rows hold the name and the number as the person
typed them, before either reaches `donors`. `deleteDonorData` now deletes the
transcript with the channel row, reading the addresses first because the
channel rows are what name it. The confirmation of the deletion is then
written as the first row of a fresh transcript, so the person reads it.

## 7. What was deleted

- `apps/bot`: `main.ts` and `diagnose.ts`. `pnpm bot` and `pnpm bot:diag` with
  them; the donor app's terminal carries the same conversation log and tick
  lines, and its `/api/health` is the probe.
- `packages/bot/src/adapters/telegram.ts`, and the `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_BOT_USERNAME` and `CHANNEL` variables. `BOT_TICK_INTERVAL_MS` and
  `BOT_LOG` stay.
- The share-button fallback in the interview (`shareButtonSentAsText`): it
  explained a Telegram client that sent the button's caption as text, and no
  channel offers that button now.
- Nothing from the in-memory channel. It is still what the tests run against,
  what the seeded pool sits on, and the degraded mode §10 asks for.

## 8. Still open

- **A donor is a device** (§3). The verified-phone link between channels is
  the designed answer and needs a channel that can verify.
- **Seeded donors stay on `memory`.** Their outbox rows are counted as queued
  for a channel this process is not running, as they were under Telegram; the
  demo plan's note on clearing them stands.
- **No rate limit on the chat route.** Telegram imposed one for us; the web
  does not. A per-device limit in the route is the obvious next step before a
  public deployment.
