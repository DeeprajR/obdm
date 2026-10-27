# Deploying OBDM

How the system goes from this repository to a public address, what it needs from
the world to get there, and what has to be true before a real record is allowed
in. Section references written as §n point at [the specification](obdm-spec.md);
the processes are the ones [backend-architecture.md §1](backend-architecture.md#1-deployable-units-and-topology)
names.

Read the last section first. The code is the smaller part of this.

---

## 1. What runs

Seven processes, two database roles, one database.

| Process | Image | Role | Replicas | Public |
|---|---|---|---|---|
| `doctor` | `Dockerfile.web`, `APP=doctor` | `app_web` | any | yes, staff sign-in |
| `admin` | `Dockerfile.web`, `APP=admin` | `app_web` | any | yes, staff sign-in |
| `centre` | `Dockerfile.web`, `APP=centre` | `app_web` | any | yes, staff sign-in |
| `volunteer` | `Dockerfile.web`, `APP=volunteer` | `app_web` | any | yes, staff sign-in, and the public board |
| `donor` | `Dockerfile.web`, `APP=donor` | `app_bot` | **one** | yes, no sign-in |
| `worker` | `Dockerfile.worker` | `app_web` | one active, standbys allowed | no |
| `migrate`, `bootstrap` | `Dockerfile.worker`, other command | `migrator` | one-shot | no |

The donor application runs the recruitment ticker in-process ([ADR 0017](adr/0017-the-donor-bot-becomes-a-web-app.md)),
so it is one instance. The worker takes an advisory lock at boot; a second one
stands by and takes over if the first lets go, which is what a rolling restart
does. Everything else is stateless and scales sideways.

What the worker runs, and how often:

| Job | Cadence | What it does |
|---|---|---|
| `drain-email-outbox` | 15 s | Sends queued invites, reset codes and address-change warnings, with retries and backoff |
| `expire-bags` | hourly | Marks `available` stock past its expiry `expired`, so it leaves the shelf count and the decision query |
| `discard-expired-quarantine` | hourly | Discards quarantined bags past their expiry and closes their quarantine, the one automatic exit from quarantine (§4) |
| `sweep-credentials` | hourly | Deletes sessions, reset codes, change links and throttle windows a day past expiry (§12.3) |

The applications also drain the email outbox after the request that queued a
message, so an invite goes out at once; the worker is what sends it when that
first attempt did not.

## 1a. The two deployments

The system is hosted as **Open Blood Donation Management (OBDM)**: production at
`obdm.deeprajr.com`, development at `dev-obdm.deeprajr.com`. Each application
is its own origin, because every session cookie is host-only and every form is
refused unless its `Origin` matches the application's own `Host` (§13), so one
name becomes five. The donor application is the public face and takes the bare
name: its `/` is the landing page for the whole system, linking a donor to the
chat at `/chat` and each member of staff to their own application's sign-in; the staff applications sit beside it, one level under `deeprajr.com`.
One level, because Cloudflare's free edge certificate covers `*.deeprajr.com`
and nothing deeper: `doctor.obdm.deeprajr.com` would fail TLS at the edge
unless Advanced Certificate Manager is bought.

| Application | Production | Development |
|---|---|---|
| Landing page, and the donor chat at `/chat` | `obdm.deeprajr.com` | `dev-obdm.deeprajr.com` |
| Doctors | `doctor-obdm.deeprajr.com` | `doctor-dev-obdm.deeprajr.com` |
| Blood centre | `centre-obdm.deeprajr.com` | `centre-dev-obdm.deeprajr.com` |
| Volunteers, and the board | `volunteer-obdm.deeprajr.com` | `volunteer-dev-obdm.deeprajr.com` |
| Administration | `admin-obdm.deeprajr.com` | `admin-dev-obdm.deeprajr.com` |

Behind Cloudflare Tunnel (§6a) each name is a public hostname on the tunnel,
and Cloudflare creates its DNS record. Behind Caddy (§6) each is an `A` record,
or a `CNAME` to the machine's name, that must resolve before the stack comes
up, because Caddy obtains a certificate per host on first request.

What differs between the two, and nothing else:

| | Production | Development |
|---|---|---|
| Environment file | `deploy/.env.production` | `deploy/.env.development` |
| Images | a `v*` release tag, pinned | `latest`, every push to `main` |
| Database | managed, point-in-time recovery, `sslmode=require` | the `local-db` profile on the same machine |
| First data | `bootstrap`: reference data and one administrator | `seed`: the synthetic demonstration records, published password |
| Email | a provider on a verified sending domain | the `mailpit` profile, inbox on the machine's port 8025 |
| Tick | 15 s | 5 s, so testing waits less |
| Real records | after §8, never before | never |

Behind Caddy, two machines rather than one, because both stacks want ports 80
and 443. Behind a tunnel neither opens a port, and the two can share a machine
with RAM for both. The stacks are named after `ENVIRONMENT`, so they never
share a volume either way. The prototype runs production only (§6a).

A build is promoted, never rebuilt: the image that ran on development under
`sha-<commit>` is the one a `v*` tag points at for production.

## 2. What it needs from outside

| Need | Requirement | Why |
|---|---|---|
| **PostgreSQL 16+** | Managed, with point-in-time recovery and a restore you have rehearsed. Three roles created by hand (§5.9). `sslmode=require` on every URL | `FOR UPDATE SKIP LOCKED` and partial unique indexes are load-bearing (§11.3). Roles are cluster-wide, so no migration creates them |
| **Object storage** | An S3-compatible private bucket. Block every form of public access. Credentials scoped to that bucket and nothing else | Seals are served only through an authenticated route (§3, §4); a public bucket would be a second, unauthenticated route |
| **Email** | A transactional provider over SMTP, on a sending domain with SPF, DKIM and DMARC published, and out of any sandbox | Invites, reset codes and address-change warnings are the three flows §2.4 puts on email. A sandboxed provider delivers to nobody |
| **Five hostnames** | One per public process, all `https`; the table in §1a | Each application's session cookie is `secure` and host-only, and every link between applications is built from these |
| **A reverse proxy** | Terminates TLS and **passes `Host` through unchanged** | Every application refuses a mutating request whose `Origin` does not match its own `Host` (§13). A proxy that rewrites `Host` breaks every form, and it looks like a CORS problem |
| **A region** | Mumbai (`ap-south-1`) is what the examples assume | Open question 5 in the architecture document: hosting region and the cross-border position, answered with counsel before there is data to move |

### Creating the roles

On a managed database, as the superuser, once:

```sql
CREATE ROLE migrator LOGIN PASSWORD '...';
CREATE ROLE app_web  LOGIN PASSWORD '...';
CREATE ROLE app_bot  LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE obdm TO migrator, app_web, app_bot;
GRANT CREATE ON DATABASE obdm TO migrator;
GRANT CREATE, USAGE ON SCHEMA public TO migrator;
```

Three different passwords, none of them the role's own name. The migrations
grant everything else: `app_web` gets `hospital` and `reference`, `app_bot` gets
`bot`, `reference` read-only and the contract columns of `hospital.donor_demand`,
and neither gets DDL. The production boot check refuses a connection string
that still carries a password from `db/docker/init.sql`.

## 3. Configuration

Every process reads its configuration from the environment. There is no `.env`
in a container. [deploy/.env.production.example](../deploy/.env.production.example)
lists every variable with a note on each; copy it to `deploy/.env.production`,
which is ignored by git and by the Docker build.

**In production, each application refuses to start** while any of the following
is missing or still a development value ([packages/config/src/runtime-env.ts](../packages/config/src/runtime-env.ts)):

| Variable | Checked for |
|---|---|
| `DATABASE_URL` | set, not the development password |
| `S3_ENDPOINT`, `S3_BUCKET` | set |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | set, not `minioadmin` |
| `SMTP_HOST` | set |
| `SMTP_PORT` | set, not Mailpit's 1025 |
| `S3_REGION` | set |
| `MAIL_FROM` | set, not on `.local` |
| `DOCTOR_APP_URL`, `ADMIN_APP_URL`, `CENTRE_APP_URL`, `VOLUNTEER_APP_URL` | `https://`, not localhost |
| `BOT_DATABASE_URL` (donor application only) | set, not the development password |

The refusal names the variable and never prints a value. The check is silent
outside `NODE_ENV=production`, so a developer's checkout keeps starting on the
defaults; silent during `next build`, which has no secrets and needs none; and
silent when the configuration was loaded from the workspace `.env`, which is a
developer running `next start` against the local stack. A container never has
that file (`.dockerignore` keeps it out of every image), so a deployment always
gets the check. Do not mount one to get past it.

Three things people look for and will not find: there is no session signing
secret (sessions are random tokens stored hashed); no timezone setting (it is a
constant in `packages/domain`); and no feature flags in the environment (they
are rows in `app_config`, changed on the administration screens and audited).

## 4. Building the images

From the repository root, one image per web application and one for the worker:

```sh
docker build -f deploy/Dockerfile.web --build-arg APP=doctor    -t obdm/doctor .
docker build -f deploy/Dockerfile.web --build-arg APP=admin     -t obdm/admin .
docker build -f deploy/Dockerfile.web --build-arg APP=centre    -t obdm/centre .
docker build -f deploy/Dockerfile.web --build-arg APP=volunteer -t obdm/volunteer .
docker build -f deploy/Dockerfile.web --build-arg APP=donor     -t obdm/donor .
docker build -f deploy/Dockerfile.worker                        -t obdm/worker .
```

[.github/workflows/release.yml](../.github/workflows/release.yml) does this on
every push to `main` and every `v*` tag, and pushes the six images to GitHub's
registry tagged with the commit (`sha-…`) and, for a tag, the version. The
workflow stops there on purpose: the step that touches production needs
production credentials, and a workflow is not where those belong.

The web images are Next's standalone output: the server, its traced
dependencies, the static assets, and nothing else. The worker image keeps the
built workspace, because the migration runner needs the migration folders on
disk and runs from the same image.

## 5. A release, in order

Every release is the same four steps, and the order is the point.

1. **Pull** the images for the version being released.
2. **Migrate**, as the migrator, both sets in release order:
   `node db/dist/src/migrate.js && node db/dist/src/migrate-bot.js`. Forward-only,
   and the second run against the same database is a no-op (§5.9); CI proves
   both before an image exists.
3. **Roll the applications.** They assert the contract version stored by step 2
   at boot and refuse to start on a mismatch (§6), so a release whose migrations
   did not run is a release whose applications do not start, rather than one
   that runs wrong.
4. **Watch the control panel** (`/panel` in administration): every dependency
   checked by doing its job, the donor bot's heartbeat, and the deployment
   screen showing which build and which configuration is in force.

Rollback is the previous images with the same database. Migrations are
forward-only, so a rollback across a migration needs the rollback plan written
at the top of that migration file and a backup taken before step 2.

### The first time

Once per deployment, after the first migration and before anybody signs in:

```sh
BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_NAME=... BOOTSTRAP_ADMIN_PASSWORD=... \
  node db/dist/src/bootstrap.js
```

It writes the location hierarchy, points the centre at its district, records
the contract version, and creates **one administrator** with the password
given. It prints nothing secret, never resets a password, refuses a database
that holds the seeded demonstration accounts, and is idempotent: a second run
reports what exists and changes nothing. That administrator invites everyone
else from the administration application (§2.2).

`pnpm db:seed` is not part of this. It refuses to run with `NODE_ENV=production`
because its four accounts share a published password, and a deployment that
has ever held them should be rebuilt before anything real goes in.

## 6. A single host

[deploy/docker-compose.yml](../deploy/docker-compose.yml) runs the seven
containers behind a proxy on one machine, which is enough for one hospital's
pilot. This section is the Caddy variant (`--profile caddy`): ports 80 and 443
open, a certificate per hostname. §6a is the Cloudflare Tunnel variant the
prototype runs. Either proxy passes `Host` through, which is the one proxy
property §13 depends on.

Production, on its machine:

```sh
cd deploy
cp .env.production.example .env.production      # and fill it in
docker compose --env-file .env.production pull
docker compose --env-file .env.production run --rm migrate
docker compose --env-file .env.production run --rm \
  -e BOOTSTRAP_ADMIN_EMAIL=... -e BOOTSTRAP_ADMIN_NAME=... -e BOOTSTRAP_ADMIN_PASSWORD=... \
  bootstrap                                      # first time only
docker compose --env-file .env.production --profile caddy up -d
```

Development, on its own machine, with the database and the mail catcher in the
stack and the synthetic records seeded in:

```sh
cd deploy
cp .env.development.example .env.development    # and fill it in
docker compose --env-file .env.development --profile local-db --profile development up -d --wait postgres mailpit
docker compose --env-file .env.development pull
docker compose --env-file .env.development run --rm migrate
docker compose --env-file .env.development --profile development run --rm seed
docker compose --env-file .env.development --profile local-db --profile development --profile caddy up -d
```

Every push to `main` publishes new `latest` images; a redeploy of development
is `pull`, `run --rm migrate`, `up -d`, in that order.

The database is expected to be managed and elsewhere. `--profile local-db` adds
a Postgres container with roles created from the passwords in the environment,
for a pilot where that is the honest answer; then the backups are yours, and
`pg_dump` on a schedule to the object store is the minimum. With that profile,
start the database first and let it become healthy before the `migrate` step:

```sh
docker compose --env-file .env.production --profile local-db up -d --wait postgres
```

## 6a. The prototype: one small server, Cloudflare in front

What the prototype runs, and what it costs:

| Piece | Where | Cost |
|---|---|---|
| The seven containers and Postgres (`--profile local-db`) | One server, x86 or ARM | $0 to about €6 a month, below |
| TLS and the five hostnames, no inbound port | Cloudflare Tunnel (`--profile tunnel`) | $0 |
| Seals, the one thing stored outside the database | Cloudflare R2 | $0 up to 10 GB |
| Invites, reset codes, address-change warnings | Brevo over SMTP | $0 up to 300 a day |
| The six images, for both architectures | GitHub Container Registry | $0 for a public repository |

**Size.** Measured in production mode: the five web applications take about
750 MB between them, the worker about 80 MB, Postgres about 230 MB. With the
operating system, Docker and `cloudflared`, about 1.4 GB. A 2 GB server works
with 2 GB of swap; 4 GB is comfortable. Never build images on the server:
`next build` wants more memory than the running system does, and the release
workflow has already built them.

**The server, one of:**

- **Oracle Cloud Always Free.** An Ampere A1 (ARM) instance, Ubuntu 24.04.
  Free while it stays within the Always Free limits. Upgrade the tenancy to
  Pay As You Go (still $0 inside those limits), because an idle Always Free
  instance can be reclaimed, and a quiet prototype looks idle.
- **AWS Free plan.** A `t4g.small` (2 GB) or `t4g.medium` (4 GB), ARM, in
  `ap-south-1`. Paid from the plan's credits, and the plan ends six months
  after sign-up or when the credits run out; after that it is an ordinary
  bill, several times a small VPS. Set a budget alert on day one.
- **Any 4 GB VPS**, about €5 to €6 a month, x86 or ARM.

Open no inbound port except SSH. The tunnel dials out.

### Accounts, in order

1. **Cloudflare Tunnel.** In the Cloudflare dashboard, at the account level:
   Networking → Tunnels (or Ctrl+K and search "Tunnels"; in Cloudflare One,
   formerly Zero Trust, it is under Networks → Connectors) → Create a tunnel →
   Cloudflared, name it `obdm`. On the install screen choose Docker and copy
   the token after `--token`; it is `TUNNEL_TOKEN`. Then add five public
   hostnames on the tunnel, each `HTTP` to a service on the compose network:

   | Public hostname | Service |
   |---|---|
   | `obdm.deeprajr.com` | `http://donor:3000` |
   | `doctor-obdm.deeprajr.com` | `http://doctor:3000` |
   | `centre-obdm.deeprajr.com` | `http://centre:3000` |
   | `volunteer-obdm.deeprajr.com` | `http://volunteer:3000` |
   | `admin-obdm.deeprajr.com` | `http://admin:3000` |

   Leave "HTTP Host Header" empty on every one. The browser's `Host` has to
   reach the application unchanged, or every form is refused as cross-origin.
2. **Cloudflare R2.** Create a bucket `obdm-prod`, public access off. Then
   Manage API tokens → Create API token → Object Read & Write, this bucket
   only. Its access key id and secret are `S3_ACCESS_KEY_ID` and
   `S3_SECRET_ACCESS_KEY`; the endpoint is
   `https://<account id>.r2.cloudflarestorage.com`, region `auto`.
3. **Brevo.** Senders, Domains & Dedicated IPs → add the domain in `MAIL_FROM`,
   `obdm-mail.deeprajr.com`, and put the records it lists into Cloudflare DNS
   (any CNAMEs as DNS only, not proxied), then verify. A subdomain of its own
   keeps OBDM's sending reputation apart from `deeprajr.com`'s own mail, and
   starts with no records to merge into. Not `obdm.deeprajr.com`: that name is
   the tunnel's CNAME, and a CNAME allows no other record beside it, so Brevo's
   TXT records could not go there. SMTP & API → SMTP: the login shown there is
   `SMTP_USER`, and a generated SMTP key is `SMTP_PASSWORD`.
4. **GitHub packages.** After the first release run, the six packages appear
   under the repository's Packages. Set each one's visibility to public, since
   the repository is public and the images hold no secret. If they stay
   private, the server needs `docker login ghcr.io` with a token that has
   `read:packages`.

### On the server

```sh
# Docker, from Docker's own script (Ubuntu, x86 or ARM)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"                 # then log out and back in

# 2 GB of swap, so a burst slows down instead of failing
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

git clone https://github.com/DeeprajR/obdm.git
cd obdm/deploy
cp .env.production.example .env.production      # fill it in; chmod 600 it
```

In `.env.production`: the Postgres passwords (`openssl rand -hex 24`, each
twice, once in its URL), `TUNNEL_TOKEN`, the R2 and Brevo values, and
`IMAGE_TAG=latest` until a `v*` release exists.

Then, the first time:

```sh
P="--env-file .env.production --profile local-db --profile tunnel"
docker compose $P up -d --wait postgres
docker compose $P pull
docker compose $P run --rm migrate
docker compose $P run --rm \
  -e BOOTSTRAP_ADMIN_EMAIL=you@example.com -e BOOTSTRAP_ADMIN_NAME='Your Name' \
  -e BOOTSTRAP_ADMIN_PASSWORD='a long one' \
  bootstrap
docker compose $P up -d
```

Start that bootstrap line with a space, so the password stays out of the shell
history.

Every update after that is the same three steps, in this order:

```sh
docker compose $P pull && docker compose $P run --rm migrate && docker compose $P up -d
```

### Check it

1. `https://admin-obdm.deeprajr.com/sign-in` as the bootstrapped administrator,
   then **Control panel**: database, storage and email each green, which means
   each did its job, not merely answered.
2. Invite yourself as a doctor. The email arrives through Brevo, and its link
   opens `doctor-obdm.deeprajr.com`.
3. The throttle sees real addresses. After a few sign-ins:

   ```sh
   docker compose $P exec postgres psql -U postgres -d obdm \
     -c "SELECT DISTINCT scope, key FROM hospital.auth_rate_limits"
   ```

   The address keys should be public IPs. A private address (`172.…`, `10.…`)
   in every row means the applications are reading the tunnel's address, every
   caller shares one throttle, and the first few failed sign-ins lock everyone
   out.

### Backups

The database is on the server, so the backup is too unless it is copied off.
A nightly dump, a week kept, added with `crontab -e`:

```
30 2 * * * cd ~/obdm/deploy && docker compose --env-file .env.production --profile local-db exec -T postgres pg_dump -U postgres -Fc obdm > ~/backups/obdm-$(date +\%F).dump && find ~/backups -name '*.dump' -mtime +7 -delete
```

Create `~/backups` first. Copy the dumps off the machine as well (to the R2
bucket with `rclone`, or anywhere else) before the data matters. Restore with
`pg_restore -U postgres -d obdm --clean` inside the container, and rehearse it
once.

## 7. Operating it

| Concern | Where it is answered |
|---|---|
| Is a process up | `GET /api/health` on each web application: one database round trip, `200` or `503`, no detail. The container `HEALTHCHECK` and the load balancer both read it |
| Is a dependency working | The control panel's tiles check email by handshake, storage by writing and reading, the database by querying (§11.9) |
| Is the bot alive | Its heartbeat row, written every tick; the panel reads a stale one as silence |
| Is the worker alive | If it stops, queued emails age past fifteen minutes and the panel's `email.outbox_backlog` alert fires. The worker's own terminal says what it did and when |
| What build is this | `BUILD_ID` in the environment, shown on `/panel/deployment` beside the stored contract version and the applied migrations |
| What went wrong | Container logs, which are the process's terminal. No donor name, phone number or health datum reaches a log line; the trace screen follows a request by its identifier |

Logs are rotated by the compose file. Ship them somewhere central if the host
can disappear.

## 8. Before a real record goes in

None of the above is the hard part. The system handles health data and donors'
phone numbers, and the build was made on the standing rule that no real record
enters it at any point. Lifting that rule is a decision, and these are its
preconditions:

- **Counsel's answers** to the four open questions marked ⚖︎ in
  [backend-architecture.md §19.3](backend-architecture.md#193-open-questions-that-need-an-answer-before-the-phase-that-depends-on-them):
  statutory retention periods (3), consent wording and the erasure carve-out (4),
  hosting region and cross-border position (5), paediatric consent (6).
- **A privacy notice** on the donor application and the public board, and
  terms for staff, both written against those answers.
- **The breach runbook.** Detection is wired to the panel's alerts; the runbook
  and the notification templates are documents that do not exist yet.
- **A written agreement** with the hospital and the blood centre naming who
  operates the system, who answers for the data, and who is called at 3am.
- **The centre's own numbers**: its product catalogue, shelf lives and return
  time limit (open questions 1 and 2), entered on the settings screen rather
  than left at the seeded defaults.
- **A decision on donor identity.** A donor is their device cookie
  ([ADR 0017 §3](adr/0017-the-donor-bot-becomes-a-web-app.md)); their phone
  number is recorded as typed. Either that is accepted for the pilot, in
  writing, or an SMS provider for a one-time code is added first.

When those are done, the rule in the README changes from "never" to "from this
date", and the seeded accounts are gone from the database it says it about.
