# Open Blood Donation Management (OBDM)

A blood request and donor recruitment system for a medical-college hospital. Doctors raise
requests, the blood centre answers them from stock, and donors nearby are recruited through a
chat for whatever the shelf could not cover. Then everyone is told how it ended, including when
it ends badly.

**Live prototype:** [obdm.deeprajr.com](https://obdm.deeprajr.com)

> [!WARNING]
> **A prototype, for demonstration only.** OBDM shows how such a system would work. It must not
> be used to manage real patients, donors or blood in any real-world setting without
> consultation with the hospital, its transfusion service, and legal and regulatory advisers.
> Everything here runs on **synthetic data**; no real donor, patient or staff record enters it.

> **Not a medical device.** This software does not make clinical decisions. Blood-group
> compatibility, donor eligibility and screening answers are screening aids only; the
> pre-donation assessment and the pre-transfusion compatibility test always happen on site.

## Contents

- [How it works](#how-it-works)
- [The applications](#the-applications)
- [Quick start](#quick-start)
- [Demo accounts and a walkthrough](#demo-accounts-and-a-walkthrough)
- [Deploying](#deploying)
- [Security model](#security-model)
- [Commands](#commands)
- [Repository layout](#repository-layout)
- [What the build enforces](#what-the-build-enforces)
- [Documents](#documents)
- [How it was built](#how-it-was-built)
- [Licence](#licence)

## How it works

```
 Doctor ──request──▶ Blood centre ──answers from stock──▶ units held, then handed over
                          │
                          └── shortfall (same transaction) ──▶ donor demand
                                                                    │
 Donors nearby ◀──── chat: "a patient near you needs O−" ◀──────────┘
      │
      ├─ yes ─▶ health questions ─▶ confirmed, told where to come ─▶ donation at the counter
      └─ thanked, or stood down if the need ends ─▶ the doctor sees how it ended
```

1. **A doctor asks.** A request is a slip: blood group, product, units and urgency, with an ID
   to read aloud to the patient's bystander.
2. **The blood centre answers** from what is on the shelf, oldest expiry first. The units are
   held for that request and marked handed over when they leave the fridge.
3. **Donors are asked for the rest.** If the shelf cannot cover it, demand is raised in the same
   transaction. The nearest eligible donors with a compatible group are messaged in waves,
   screened with a few health questions, and confirmed until the units are covered.
4. **Everyone hears how it ended.** Donors are thanked with their next eligible date, those still
   holding a place are stood down, and a cancelled request releases its units and its donors at
   once.

## The applications

Every role has its own application, its own address and its own sign-in. An account is refused
everywhere but its own application, exactly like a wrong password.

| Application | For | Local | Prototype address | Access |
|---|---|---|---|---|
| **Landing page** | Everyone | :3004 `/` | [obdm.deeprajr.com](https://obdm.deeprajr.com) | Open |
| **Donor chat** | Donors | :3004 `/chat` | [obdm.deeprajr.com/chat](https://obdm.deeprajr.com/chat) | Open, no account; the browser remembers you |
| **Demand board** | Anyone | :3003 `/board` | [volunteer-obdm.deeprajr.com/board](https://volunteer-obdm.deeprajr.com/board) | Open; groups and places only, never a person |
| **Doctors** | Ward doctors | :3000 | [doctor-obdm.deeprajr.com](https://doctor-obdm.deeprajr.com) | Invited by an administrator |
| **Blood centre** | Blood centre staff | :3002 | [centre-obdm.deeprajr.com](https://centre-obdm.deeprajr.com) | Invited by an administrator |
| **Volunteer coordinators** | Donor-drive coordinators | :3003 | [volunteer-obdm.deeprajr.com](https://volunteer-obdm.deeprajr.com) | Invited by an administrator |
| **Administration** | Administrators | :3001 | [admin-obdm.deeprajr.com](https://admin-obdm.deeprajr.com) | The first one is created on the server; others invited |

A **worker** process runs alongside them with no screen: it sends queued email, expires stock
past its date, discards quarantined units that expire, and sweeps expired sessions and codes.

**The donor chat** opens on what is needed right now (blood groups and units, live) and asks
nothing until the visitor chooses to register. Registering takes about a minute, and nothing
is saved until they agree at the end. A registered donor is messaged only when a patient near
them needs their group, and chooses each time whether they can come.

**Staff accounts** start with an emailed invitation; the person opens it and chooses their own
password. Doctors, centre staff and coordinators can reset a forgotten password from their
sign-in page with a six-digit emailed code. Administrator passwords have no self-service reset.

## Quick start

Needs **Node 20+**, **pnpm** and **Docker**.

Run these one at a time. **Do not chain them with `&&`**: Windows PowerShell 5.1, which is what
`pnpm` opens by default on Windows, does not accept it as a statement separator.

```sh
pnpm install
cp .env.example .env    # everything already points at the local stack
pnpm bootstrap          # Docker up, both migration sets, seed. In order
pnpm verify             # typecheck, lint, boundaries, tests
pnpm dev                # all five applications and the worker
```

Then open http://localhost:3004 for the landing page.

| Service | Where |
|---|---|
| Doctor / admin / centre / volunteer / donor | http://localhost:3000 / 3001 / 3002 / 3003 / 3004 |
| Postgres | `localhost:5433`, **not** 5432, so a natively installed server cannot be reached by accident ([ADR 0001](docs/adr/0001-phase-0-decisions.md)) |
| Mailpit inbox (every email the apps send) | http://localhost:8025 |
| Object storage bucket (S3Mock) | `curl http://localhost:9090/obdm` |

Good to know:

- There is one `.env`, at the workspace root, shared by every application, the worker and the
  database scripts. Each app's `next.config.ts` loads it.
- `pnpm dev` builds the packages first (`tsc -b`), because the applications load them from their
  `dist`. After editing a package while the servers run, rebuild it with `npx tsc -b`.
- `pnpm services:up` / `pnpm services:down` start and stop the Docker stack. (Not `pnpm up`,
  which is pnpm's own alias for `pnpm update`.)
- Database roles come from `db/docker/init.sql`, which Postgres runs only on first start. To
  start clean: `docker compose down -v`, then `pnpm bootstrap`.

## Demo accounts and a walkthrough

`pnpm db:seed` (part of `pnpm bootstrap`) creates synthetic stock, patients, a donor pool and one
account per role, all with the password **`OBDM!Demo2026`**:

| Role | Email | Signs in at | Lands on |
|---|---|---|---|
| Doctor | `doctor@obdm.invalid` | http://localhost:3000/sign-in | `/dashboard` |
| Administrator | `admin@obdm.invalid` | http://localhost:3001/sign-in | `/doctors` |
| Blood centre | `centre@obdm.invalid` | http://localhost:3002/sign-in | `/centre` |
| Volunteer coordinator | `volunteer@obdm.invalid` | http://localhost:3003/sign-in | `/volunteer` |

These exist only on a development database: the seed refuses to run with
`NODE_ENV=production`, and a production database is brought up with `pnpm db:bootstrap` instead,
which creates one administrator with a password you choose.

**The loop, end to end**, the thing a demonstration shows:

1. As the **doctor**, submit a request for **4 units of PRBC, O−**. You get a request number
   back, read-aloud length (`DDMMYY-NNNNN`).
2. As the **blood centre**, answer it from the queue. What is on the shelf is held for it,
   oldest expiry first; whatever is short raises donor demand in the same transaction.
3. In the **donor chat**, register a donor. The ticker picks the demand up on its next tick and
   messages the nearest wave of eligible donors.
4. The donor accepts, answers the health questions, and is confirmed, told where and by when.
5. **Cancel the request** from the doctor's request view. Every donor who agreed to come is
   stood down at once, in the same transaction that releases the held units. Show this one
   deliberately: it is the step systems of this kind most often get wrong.
6. Raise it again, let a donor confirm, and mark them **Donated** at the centre's counter. They
   are thanked with their next eligible date, and the demand closes once every unit is in.

`pnpm showcase` plays this on screen, one window per role, with a caption for every step.

## Deploying

The prototype runs on **one small server** behind **Cloudflare Tunnel**, with **Cloudflare R2**
for file storage and **Brevo** for email, at roughly zero cost. The step-by-step guide, from
accounts to backups, is [docs/deployment.md §6a](docs/deployment.md#6a-the-prototype-one-small-server-cloudflare-in-front).

In outline:

- **Images:** `.github/workflows/release.yml` builds an image per application for both
  `linux/amd64` and `linux/arm64` on every push to `main`, published to
  `ghcr.io/deeprajr/obdm/<app>`.
- **Stack:** [deploy/docker-compose.yml](deploy/docker-compose.yml) runs the seven containers,
  Postgres (`--profile local-db`) and the tunnel (`--profile tunnel`). No inbound port is
  opened; TLS ends at Cloudflare. Caddy on 80/443 is the alternative (`--profile caddy`).
- **Settings:** `deploy/.env.production`, copied from
  [the example](deploy/.env.production.example) and never committed. Each application refuses to
  start in production while a required value is missing or still a development default.
- **A release:** `pull`, then `run --rm migrate`, then `up -d`, in that order. The applications
  check the database's contract version at boot and refuse a mismatch.
- **Hostnames** are one level under the domain (`doctor-obdm.deeprajr.com`, not
  `doctor.obdm.deeprajr.com`), because Cloudflare's free certificate covers only one level.

## Security model

- **Separate origins.** Each staff application is its own origin with its own host-only session
  cookie, and every session records which application issued it. A cookie from one is inert in
  the others.
- **Sessions:** httpOnly, `SameSite=Lax`, `Secure` in production. The database stores only a
  fingerprint of the session token, never the token.
- **Passwords:** Argon2id. Nobody, administrators included, can read one back. Sign-in is
  throttled per address and per account, in the database.
- **CSRF:** every mutating server action is refused unless its `Origin` matches the
  application's own `Host`.
- **Authorization** is checked three times: the route, the page, and the use case, all reading
  one decision function. The role matrix is a test.
- **Least privilege in the database:** the web applications connect as `app_web`, the donor chat
  as `app_bot`, migrations as `migrator`. Tests connect as each role and assert what it cannot
  do.
- **Minimal disclosure:** the donor chat and the demand board show blood groups, units and
  places, never a patient. A donor's phone number reaches the blood centre only after they say
  yes to a patient.
- **Uploaded seals** go to a private bucket and are only ever served through an authenticated
  route.

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | All five applications and the worker, in development |
| `pnpm verify` | Everything CI runs, in the same order |
| `pnpm typecheck` / `pnpm lint` | TypeScript (including the test files) / ESLint, type-aware |
| `pnpm test` | Vitest against real Postgres. Database suites skip without `TEST_DATABASE_URL` |
| `pnpm boundaries` / `pnpm boundaries:prove` | The import boundary (§11.2) / prove the check rejects a deep import |
| `pnpm check:gates` | Every page decides access (§13); every mutating use case records what it did (§14) |
| `pnpm e2e` | The browser suite against running servers: the staff sign-ins, the landing page and the whole loop. `pnpm e2e:show` runs it headed; `pnpm e2e:report` opens the report |
| `pnpm showcase` | The system used visibly, one flow at a time, with captions. `$env:SHOWCASE='all'` adds every application's own flows |
| `pnpm smoke:signin [url]` | Signs in the way a browser with no JavaScript would |
| `pnpm smoke:centre` / `pnpm smoke:bot` | The centre's and the bot's writes as their real database roles, and what those roles must not reach |
| `pnpm build` | Production build of every application |
| `pnpm services:up` / `pnpm services:down` | Start / stop Postgres, Mailpit and S3Mock |
| `pnpm db:migrate` / `pnpm db:migrate:bot` | Apply either migration set |
| `pnpm db:seed` / `pnpm db:bootstrap` | Synthetic demonstration data (development) / reference data and one administrator (production) |
| `pnpm db:generate` / `pnpm db:generate:bot` | Generate a migration from the Drizzle schema |
| `pnpm clean:next` | Delete the `.next` caches, for a development server describing a build that no longer exists |
| `node scripts/make-icons.mjs` | Regenerate the PWA icons |

## Repository layout

```
apps/
  doctor/     doctors: requests, patients, samples (:3000)
  admin/      administration: staff accounts and the control panel (:3001)
  centre/     the blood centre: stock, requests, hand-over, returns, demand, the counter (:3002)
  volunteer/  volunteer coordinators, and the public demand board (:3003)
  donor/      the landing page and the donor chat, with the recruitment ticker in-process (:3004)
  worker/     scheduled jobs: email, stock expiry, quarantine discards, credential sweep
packages/
  platform/   accounts, sessions, authorization, audit, email, storage; shared by every app
  staff-web/  the frame the three clinical staff apps share: session, guards, account pages
  hospital/   Module 1: patients, admissions, requests
  centre/     Module 2: the register, the decision, hand-over, returns, demand, the stock floor
  bot/        Module 3: onboarding, waves, screening, the outbox and the stand-down
  volunteer/  the volunteer dashboard's reads; it cannot name a table that holds a person
  ops/        health tiles, metrics and the trace behind the control panel
  ui/         the clinical design kit every app is drawn with (ADR 0015)
  domain/     the clinical rules, pure: no clock, no I/O
  contract/   the two tables the web side and the bot share
  config/     clinical thresholds as data; the production boot checks
  result/ ids/ testing/   Result<T, E>, UUIDv7 ids, the real-Postgres test harness
db/           Drizzle schema, both migration sets, seeds, bootstrap
deploy/       Dockerfiles, the compose stack, env examples
e2e/          the Playwright suite and the showcase
docs/         the specification set, the guides and the decision log
```

## What the build enforces

Because there is no second reader on a commit here, CI is the reviewer:

- **`packages/domain` imports nothing outside itself.** The clinical rules exist once, so the
  web side and the bot can never disagree about who may donate to whom (§11.3).
- **No deep imports across packages.** A package's entry point is its contract (§11.2).
- **The full 8×8 compatibility matrix is tested against a table written out by hand**, not
  derived from the implementation.
- **Migrations only.** `db:push` is refused outside a scratch database, and in CI (§5.9).
- **The grants are asserted, not reviewed.** Tests connect as `app_web` and `app_bot` and check
  what they *cannot* do.
- **Every state machine is checked for states with no way out**, the failure §8 exists to
  prevent.
- **Every application is an installable PWA** whose service worker caches the shell and
  **never** data: a cached stock figure is a wrong stock figure
  ([ADR 0004](docs/adr/0004-pwa-and-a-spacing-token-that-does-not-exist.md)).

## Documents

| Document | What it says |
|---|---|
| [obdm-spec.md](docs/obdm-spec.md) | The system's behaviour: the source of truth. §n references point here |
| [modules-spec.md](docs/modules-spec.md) | The four modules, flow by flow |
| [input-fields.md](docs/input-fields.md) | Every screen that accepts input, and every field on it |
| [backend-architecture.md](docs/backend-architecture.md) | Processes, schema, transactions, ports |
| [deployment.md](docs/deployment.md) | Images, configuration, a release in order, the one-server prototype (§6a), and what must be true before a real record goes in (§8) |
| [qa-test-plan.md](docs/qa-test-plan.md) | Manual test protocol: every flow, and how it is most likely to break |
| [e2e-user-flows.md](docs/e2e-user-flows.md) | User flows to walk end to end, with what every step should show |
| [playwright-automation-plan.md](docs/playwright-automation-plan.md) | The plan for the browser suite |
| [build-plan.md](docs/build-plan.md) | In what order it was built |
| [docs/user-guides/](docs/user-guides/) | Plain-language guides for each kind of user |
| [docs/adr/](docs/adr/) | Decisions taken along the way, and why |

## How it was built

Built in phases, each closing with a decision record. The detail lives in the ADRs.

```
P0  Foundations                       ✅  ADR 0001
P1  Identity and access               ✅  ADR 0002, 0003
P2  The request                       ✅
P3  The centre decision               ✅  ADR 0005
P4  The bot loop                      ✅  ADR 0006  ▲ Milestone A, the loop closes
P5  Module 1 depth                    ✅  ADR 0007
P6  Centre depth, collisions          ✅  ADR 0008
P7  The donor interview               ✅  ADR 0009
P7b The request slip                  ✅  ADR 0010
P8  Endings sweep                     ✅  ADR 0011, 0012  ▲ Milestone B
P9  Volunteer dashboard, public board ✅  ADR 0013
P10 Control panel                     ✅  ADR 0014
P11 Tag reader integration            ⏸  gated on hardware
P12 Vision, shadow mode               ⏸  gated on hardware
P13 Demo readiness                    ✅  ▲ Milestone C
    In-repo design kit                ✅  ADR 0015
    One application per role          ✅  ADR 0016
    Donor bot becomes a web app       ✅  ADR 0017
    Public deployment                 ✅  ADR 0018
```

## Licence

Apache-2.0 (§12.7). See [`LICENSE`](LICENSE) for the full text and [`NOTICE`](NOTICE) for
attribution. **The copyright holder named in `NOTICE` is a placeholder**, pending confirmation
from whichever hospital, university or other entity this is released in the name of.
