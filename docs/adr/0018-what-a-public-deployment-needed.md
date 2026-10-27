# ADR 0018: What a public deployment needed

Date: 2026-10-26 · Status: accepted · Extends ADR 0003, ADR 0016, ADR 0017

Milestone C made the system demonstrable. This records what stood between
demonstrable and deployable, and what was built for each. The list came from
reading the code the way an operator would: what happens on a machine with no
`.env`, no seed, and a mail provider that is sometimes down.

---

## 1. The worker exists

ADR 0003 §6 left the email drain running after the request that queued the
message, and the architecture document carried a "not yet built" against the
worker since §1 was written. Three things depended on it and had no other
home: the retry of an email the first attempt did not send, the hourly expiry
of stock past its date, and the deletion of credentials §12.3 says must be
deleted rather than marked. `expireStaleBags` had been exported since P3 and
called by nothing.

`apps/worker` is a plain Node process on the same packages and the same role
as the web applications, with a schedule of three jobs and a Postgres advisory
lock so a rolling deploy never runs two. It publishes no heartbeat of its own:
`process_health` admits two processes by constraint, and the signal that
matters is already there. A worker that stops leaves queued emails to age past
fifteen minutes, and the panel's backlog alert fires.

The credential sweep is a new use case, `sweepExpiredCredentials`, with a day
of grace after expiry and an audit row carrying counts and nothing else. It
leaves invites alone, because the administrator's list reads them to say how
long an account has been waiting.

## 2. A process refuses to start unconfigured

§13 said the process refuses to start on a missing secret. It did, for the
connection string. For everything else the adapters fell back to the
development stack: MinIO on localhost with `minioadmin`, Mailpit on port 1025,
and application origins on `localhost:300x`, so a deployment that forgot one
variable would run, send invite links to localhost, and look fine from outside.

The rules now live as data in `packages/config` (`WEB_RUNTIME_RULES`,
`BOT_RUNTIME_RULES`), one predicate per variable, and each application's
instrumentation hook asserts them once at boot, in production only. The check
is pure so it is tested against a fake environment; the refusal names the
variable and never the value. Three variables that `.env.example` listed and
nothing read, `SESSION_SECRET`, `GEOCODER`, `APP_TIMEZONE` and `DEPLOY_REGION`,
are gone from it, with a note on why each does not exist: an operator rotating
a signing secret that signs nothing is worse than no secret at all.

## 3. A database can be brought up without the seed

The seed refused to run in production, correctly, and was also the only thing
that wrote the location hierarchy, the centre's district and the contract
version. A production database could be migrated and then nothing would start.

The three shared steps moved to `db/src/provision.ts`, called by the seed and by
a new `db:bootstrap` that adds exactly one administrator, with a password the
operator supplies and the script never prints. It never resets a password,
refuses a database that holds the seeded `.invalid` accounts, and is
idempotent. Every other account is invited by that administrator, which is
the only provisioning path §2.2 ever sanctioned for a real deployment.

## 4. The chat route has a limit

ADR 0017 §8 named it as the step before a public deployment: a chat platform
imposed a rate limit for the bot, and the web did not. `bot.chat_rate_limits`
(bot migration 0005) is the sign-in throttle's shape in the bot's own schema,
counted per device and per address, every request counted whether allowed or
refused. The route answers `429` with `Retry-After`, the chat screen says
"that was quick" rather than "could not reach", and the ticker prunes
day-old windows.

Reading the chat screen for this found a smaller thing: a failed send cleared
the composer while the error beneath it promised nothing had been lost. The
draft now goes back where it was typed.

## 5. Headers, images, and the pipeline

- Every response from every application carries the same security headers,
  from one file the five configurations import (`scripts/next-security-headers.mjs`).
  The policy is same-origin for script, style and connections, which is true
  of these applications; `frame-ancestors 'none'`; HSTS in production. Not
  `form-action`: the wrong-application password reset answers a form post
  with a cross-origin redirect, and browsers apply `form-action` to that.
- `deploy/Dockerfile.web` builds any of the five web applications as a
  standalone server, selected by build argument; `deploy/Dockerfile.worker`
  carries the worker and, with a different command, the migration runner and
  the bootstrap. `NEXT_OUTPUT=standalone` turns the standalone output on for
  the image build and leaves a developer's `next start` as it was.
- `deploy/docker-compose.yml` is one host behind Caddy, with the database
  expected elsewhere. `.github/workflows/release.yml` builds and pushes the
  six images and stops, because the step after needs production credentials.
- CI scans every push for a committed secret (§11.7 had said so; nothing did
  it), with the development passwords allowlisted by name.

## 6. Two things from the operator's list

The sidebar names the signed-in person and their address rather than only
their role, which on a shared workstation is the line that says the previous
shift forgot to sign out. The "somebody is here with an ID" card left the
request queue: the queue row already carries the identifier and the "take
details" action, and a second entry point to the same page was a second thing
to explain.

## 7. What reading for a deployment found in the loop

Reading the loop the way an operator would, rather than the way a demo runs
it, found seven places the code and §5 disagreed. Each has a test now.

- **A roster "Cancelled" outcome was acknowledged and then ignored.** The
  counter's third outcome (`roster.ts`) had no branch in `outcomes.ts`: the
  journey stayed confirmed, the count stayed up, nobody was promoted and the
  person was never told. It now releases the place exactly as a no-show does,
  with its own wording.
- **A freed place on a filled request was never recruited for again.** A
  request moved to `fulfilled` stopped its waves, and nothing moved it back;
  with an empty waitlist, a no-show left the demand "in progress" with a unit
  outstanding until it expired. A freed place with nobody waiting now reopens
  the request with a wave due at once, and promotion from the waitlist marks
  it full again when it fills the last place.
- **Counter outcomes reached the centre's counters only by accident.** They
  were not among the requests the ticker wrote back, so "collected" on the
  roster header lagged until something else touched the request. They are
  written back in the pass that applied them.
- **Accepting a card for a request that had filled walked the person through
  all six questions** before telling them it was full, which §5 names as the
  thing not to do. A tap on a full request waitlists at once; the state
  machine always allowed `NOTIFIED → REQUEST_FILLED`, and now something uses
  it.
- **An overdue request's shortfall raised a demand dated in the past**, which
  the bot expires before anyone is asked, by design. The demand is dated no
  earlier than today.
- **An IP number one digit off silently re-pointed a request at another
  patient's admission**, because an existing admission was reused without
  looking at the name or the group typed beside it. It is refused unless both
  match the admission, and the counter is told to check the digits.
- **Form times were read on the server's clock.** A `datetime-local` value
  has no zone, and `new Date()` on a UTC server put a sample collected at
  14:00 at 19:30, refusing anything within five and a half hours of now as
  the future. `parseLocalDateTime` in `packages/domain` reads it on the
  hospital's clock, and the images set `TZ` as a second line of defence.

Three more in what this ADR itself added, found by review before it shipped:
the chat throttle keyed on the forwarded entry the client controls (the
nearest proxy's entry is read now, validated as an address, and the staff
sign-in throttle was corrected the same way); the worker's lock check could
not see the driver reconnecting under it (the backend pid is compared each
pass); and the email drain's claim stopped excluding rows the moment it
committed, so two drains could send one invite twice (the claim leases the
row past the send).

## 7a. The storage stand-in

The day this was written, MinIO's images stopped being pullable without an
account from Docker Hub and from quay.io alike, and the first fresh
`pnpm up` after a `docker compose down -v` failed on it. The local stand-in
is now S3Mock (`adobe/s3mock`, Apache-2.0), as the `storage` service on
:9090: it speaks the four S3 calls the adapter makes, creates the bucket
itself, and has no console, so the bucket is listed with `curl`. Nothing
above the port changed, which is what §10 keeps the port for. The same
failure had hidden behind "Failed query: CREATE SCHEMA" because the
migration scripts printed `String(error)`, dropping the refused connection
underneath; they print the cause now, with the two commands that fix it.

## 8. The name

The product is **Open Blood Donation Management**, OBDM for short, hosted at
`obdm.deeprajr.com` with a development deployment at `dev-obdm.deeprajr.com`.
The screens, the emails, the manifests and the user guides say OBDM; the
brand mark is an O. The specification, the architecture document, the
decision records, the package scope `@obdm/*` and the database name say
OBDM too.

## 9. Still open

The code side is done. What remains is in [docs/deployment.md §8](../deployment.md#8-before-a-real-record-goes-in),
and none of it is code: counsel's four answers, the privacy notice, the breach
runbook, the agreement with the hospital, the centre's own numbers, and a
decision on whether a donor may remain their device for the pilot.
