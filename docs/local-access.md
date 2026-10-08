# Local access reference

Every URL, port and credential for the local development stack, in one place.

Nothing here is a secret. The infrastructure passwords live in
`docker-compose.yml` and `db/docker/init.sql`, both committed, and the seeded
staff password is printed by the seed runner. That is safe only because nothing
real ever runs against this stack. The seed refuses to run with
`NODE_ENV=production`, and the compose file is not a deployment.

Bring the stack up with `pnpm bootstrap` (Docker, migrations, seed), then start
the applications with `pnpm dev` and the bot with `pnpm bot`.

## Applications

| Application | URL | Runs with | Who signs in | Cookie |
|---|---|---|---|---|
| Doctor app | http://localhost:3000 | `pnpm dev` | Doctor only | `bc_doctor_session` |
| Administration | http://localhost:3001 | `pnpm dev` | Administrator only | `bc_admin_session` |
| Blood centre app | http://localhost:3002 | `pnpm dev` | Blood centre only | `bc_centre_session` |
| Volunteer app | http://localhost:3003 | `pnpm dev` | Volunteer admin only | `bc_volunteer_session` |
| Bot worker | no HTTP port | `pnpm bot` | Telegram long polling, or the in-memory channel | none |

The four applications are separate deployments, one per role (ADR 0003, ADR
0015). Each has its own sign-in page and refuses every other role's account
exactly like a wrong password. A session names the application that issued it,
so a cookie from one is inert in the other three.

The bot opens no port. It polls Telegram, or runs entirely in process when
`CHANNEL=memory` is set.

## Seeded staff accounts

All four share one password, printed by `pnpm db:seed`.

```
BloodConnect!Demo2026
```

| Role | Email | Sign-in page | Lands on |
|---|---|---|---|
| Doctor | doctor@blood-connect.invalid | http://localhost:3000/sign-in | http://localhost:3000/dashboard |
| Administrator | admin@blood-connect.invalid | http://localhost:3001/sign-in | http://localhost:3001/doctors |
| Blood centre | centre@blood-connect.invalid | http://localhost:3002/sign-in | http://localhost:3002/centre |
| Volunteer admin | volunteer@blood-connect.invalid | http://localhost:3003/sign-in | http://localhost:3003/volunteer |

The domain is `.invalid`, which RFC 2606 reserves so it can never resolve. A
seeded identifier cannot collide with a real person.

## Pages that need no account

| Page | URL |
|---|---|
| Public demand board | http://localhost:3003/board |
| Landing pages | http://localhost:3000, http://localhost:3002, http://localhost:3003 |
| Password reset | `/reset` on each of the three staff apps |
| Health checks | `/api/health` on each of the four apps |

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
| MinIO S3 API | http://localhost:9000 | `minioadmin` | `minioadmin` |
| MinIO console | http://localhost:9001 | `minioadmin` | `minioadmin` |

Postgres is on 5433, not 5432, so a natively installed server cannot be reached
by accident. Mailpit accepts any SMTP credentials, including none, because
`MP_SMTP_AUTH_ACCEPT_ANY` is set. The MinIO bucket is `blood-connect` and its
anonymous policy is `none`, so objects are only ever served through an
authenticated route.

## Database roles

Four connection strings, deliberately not interchangeable. The superuser exists
only because the container creates it.

| Role | Password | Database | Holds |
|---|---|---|---|
| `migrator` | `migrator` | `blood_connect` | DDL rights, applies migrations and seeds |
| `app_web` | `app_web` | `blood_connect` | Read/write `hospital`, read `reference`, nothing in `bot` |
| `app_bot` | `app_bot` | `blood_connect` | Read/write `bot`, read `reference`, contract columns of `hospital.donor_demand` |
| `postgres` | `postgres` | `blood_connect` | Container superuser |

The test database is `blood_connect_test`, owned by `postgres` and connected to
as `migrator`. The suite truncates every table between tests, so the harness
refuses any URL that is not named for testing.

Connection strings, as they appear in `.env`:

```
MIGRATION_DATABASE_URL=postgres://migrator:migrator@localhost:5433/blood_connect
DATABASE_URL=postgres://app_web:app_web@localhost:5433/blood_connect
BOT_DATABASE_URL=postgres://app_bot:app_bot@localhost:5433/blood_connect
TEST_DATABASE_URL=postgres://migrator:migrator@localhost:5433/blood_connect_test
```

Roles come from `db/docker/init.sql`, which Postgres runs only on first start.
A database that already exists will not re-run it. Use `docker compose down -v`
then `pnpm up` to start clean.

## Chat channel

| Setting | Value |
|---|---|
| Bot username | `cmck_blood_donor_bot` |
| Deep link | `https://t.me/cmck_blood_donor_bot?start=<request id>` |
| Token | `TELEGRAM_BOT_TOKEN` in `.env`, from @BotFather |

Set `CHANNEL=memory` to run with no token at all. Recruitment, screening,
confirmation and the stand-downs all work, and nothing leaves the process.

## Object storage

| Setting | Value |
|---|---|
| Endpoint | http://localhost:9000 |
| Region | `ap-south-1` |
| Bucket | `blood-connect` |
| Access key | `minioadmin` |
| Secret key | `minioadmin` |
| Path style | forced on |

Seal images are read back through http://localhost:3001/api/seal/&lt;id&gt;, which
requires an administrator session. The bucket itself serves nobody.

testdoctor@blood-connect.invalid
123456789011