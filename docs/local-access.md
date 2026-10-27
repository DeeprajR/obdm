# Local access reference

Every URL, port and credential for the local development stack, in one place.

Nothing here is a secret. The infrastructure passwords live in
`docker-compose.yml` and `db/docker/init.sql`, both committed, and the seeded
staff password is printed by the seed runner. That is safe only because nothing
real ever runs against this stack. The seed refuses to run with
`NODE_ENV=production`, and the compose file is not a deployment.

Bring the stack up with `pnpm bootstrap` (Docker, migrations, seed), then start
all five applications with `pnpm dev`. The donor app is the bot.

## Applications

| Application | URL | Runs with | Who signs in | Cookie |
|---|---|---|---|---|
| Doctor app | http://localhost:3000 | `pnpm dev` | Doctor only | `bc_doctor_session` |
| Administration | http://localhost:3001 | `pnpm dev` | Administrator only | `bc_admin_session` |
| Blood centre app | http://localhost:3002 | `pnpm dev` | Blood centre only | `bc_centre_session` |
| Volunteer app | http://localhost:3003 | `pnpm dev` | Volunteer admin only | `bc_volunteer_session` |
| Donor app (the bot) | http://localhost:3004 | `pnpm dev` | Nobody signs in: a donor is a device | `bc_donor_chat` (identity, not a session) |

The four staff applications are separate deployments, one per role (ADR 0003,
ADR 0016). Each has its own sign-in page and refuses every other role's account
exactly like a wrong password. A session names the application that issued it,
so a cookie from one is inert in the other three.

The donor app is the bot (ADR 0017). It runs on the `app_bot` database role,
holds the recruitment ticker in-process, and presents the conversation as a
chat screen. There is no chat-platform token and nothing leaves the machine.

## Seeded staff accounts

All four share one password, printed by `pnpm db:seed`.

```
OBDM!Demo2026
```

| Role | Email | Sign-in page | Lands on |
|---|---|---|---|
| Doctor | doctor@obdm.invalid | http://localhost:3000/sign-in | http://localhost:3000/dashboard |
| Administrator | admin@obdm.invalid | http://localhost:3001/sign-in | http://localhost:3001/doctors |
| Blood centre | centre@obdm.invalid | http://localhost:3002/sign-in | http://localhost:3002/centre |
| Volunteer admin | volunteer@obdm.invalid | http://localhost:3003/sign-in | http://localhost:3003/volunteer |

The domain is `.invalid`, which RFC 2606 reserves so it can never resolve. A
seeded identifier cannot collide with a real person.

## Pages that need no account

| Page | URL |
|---|---|
| Public demand board | http://localhost:3003/board |
| Donor chat | http://localhost:3004 |
| A request link into the donor chat | http://localhost:3004/r/&lt;request id&gt;, for example `/r/BC-ABCD2345` |
| Landing pages | http://localhost:3000, http://localhost:3002, http://localhost:3003 |
| Password reset | `/reset` on each of the three staff apps |
| Health checks | `/api/health` on each of the five apps |

A reset finished in the wrong app still works: the new password is set, and the
page sends the person to their own app's sign-in rather than signing them in
somewhere their session cannot be read.

Invite and email-confirmation links carry a token in the path and arrive by
mail, so read them out of Mailpit rather than typing them.

## Infrastructure

| Service | URL or host | Username | Password |
|---|---|---|---|
| Postgres | `localhost:5433` | see the database roles below | see the database roles below |
| Mailpit web inbox | http://localhost:8025 | none | none |
| Mailpit SMTP | `localhost:1025` | any value accepted | any value accepted |
| S3Mock S3 API | http://localhost:9090 | `local` | `local-dev-only` (neither is checked) |

Postgres is on 5433, not 5432, so a natively installed server cannot be reached
by accident. Mailpit accepts any SMTP credentials, including none, because
`MP_SMTP_AUTH_ACCEPT_ANY` is set. The bucket is `obdm` and its
anonymous policy is `none`, so objects are only ever served through an
authenticated route.

## Database roles

Four connection strings, deliberately not interchangeable. The superuser exists
only because the container creates it.

| Role | Password | Database | Holds |
|---|---|---|---|
| `migrator` | `migrator` | `obdm` | DDL rights, applies migrations and seeds |
| `app_web` | `app_web` | `obdm` | Read/write `hospital`, read `reference`, nothing in `bot` |
| `app_bot` | `app_bot` | `obdm` | Read/write `bot`, read `reference`, contract columns of `hospital.donor_demand` |
| `postgres` | `postgres` | `obdm` | Container superuser |

The test database is `obdm_test`, owned by `postgres` and connected to
as `migrator`. The suite truncates every table between tests, so the harness
refuses any URL that is not named for testing.

Connection strings, as they appear in `.env`:

```
MIGRATION_DATABASE_URL=postgres://migrator:migrator@localhost:5433/obdm
DATABASE_URL=postgres://app_web:app_web@localhost:5433/obdm
BOT_DATABASE_URL=postgres://app_bot:app_bot@localhost:5433/obdm
TEST_DATABASE_URL=postgres://migrator:migrator@localhost:5433/obdm_test
```

Roles come from `db/docker/init.sql`, which Postgres runs only on first start.
A database that already exists will not re-run it. Use `docker compose down -v`
then `pnpm services:up` to start clean.

## The donor chat

| Setting | Value |
|---|---|
| Address | http://localhost:3004 |
| Request link | `http://localhost:3004/r/<request id>` |
| Identity | The `bc_donor_chat` cookie. Clear it, or use another browser, to be a new donor |
| Tick interval | `BOT_TICK_INTERVAL_MS` in `.env`, 15 seconds by default |
| Conversation log | On the donor app's terminal. `BOT_LOG=off` silences it |

No token and no platform. The seeded donor pool sits on the in-memory channel,
so messages queued for it are counted on each tick as queued for a channel this
process is not running, and are never delivered anywhere.

## Object storage

| Setting | Value |
|---|---|
| Endpoint | http://localhost:9000 |
| Region | `ap-south-1` |
| Bucket | `obdm` |
| Access key | `local` |
| Secret key | `local-dev-only` |
| Path style | forced on |

Seal images are read back through http://localhost:3001/api/seal/&lt;id&gt;, which
requires an administrator session. The bucket itself serves nobody.

testdoctor@obdm.invalid
123456789011