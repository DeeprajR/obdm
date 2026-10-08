# ADR 0016: One application per role

Date: 2026-09-19 · Status: accepted · Extends ADR 0003

ADR 0003 took administration out of the staff application. This takes the rest
of it apart: doctors, the blood centre and volunteer admins each get their own
deployment, their own sign-in page and their own session, instead of one sign-in
that looked at the role and routed.

---

## 1. Four applications

| | Application | Port (dev) | Role | Session audience | Cookie |
|---|---|---|---|---|---|
| A | `apps/doctor` | 3000 | doctor | `doctor` | `bc_doctor_session` |
| E | `apps/admin` | 3001 | admin | `admin` | `bc_admin_session` |
| F | `apps/centre` | 3002 | blood_centre | `centre` | `bc_centre_session` |
| G | `apps/volunteer` | 3003 | volunteer_admin | `volunteer` | `bc_volunteer_session` |

Letters follow the architecture plan's §1, where B, C and D are the worker, the
bot and vision. The doctor app keeps :3000 because it is where most links already
point. The public demand board lives in the volunteer app: it is Module 4's
public face, and the volunteer dashboard is where its link is shared from.

**Why it is defensible.** It is ADR 0003's argument again, one level down. A
compromised doctor account reaches no centre screen, and a compromised centre
account reaches no request form, not because a route rule says no but because
the other application does not resolve its session at all. §2.2's separation
between raising a request and deciding it becomes a separation between two
deployments.

**What it costs.** Four builds instead of two, and an account can now fail to
sign in because it is at the wrong address. §2 below is how the second is kept
small.

## 2. The sign-in names its application, and the others

Each application admits one role. An account at the wrong one is refused
**exactly like a wrong password**: same message, same timing, audited as
`wrong_audience_<role>`. Anything more specific would tell the form that the
address has an account somewhere else, which §15 forbids.

So the sign-in card says whose it is ("For blood centre staff") and links to the
other two staff sign-ins. It names places and never learns anything from the
address typed into it. It does not link to administration, which has no reason
to be advertised on a public page.

A password reset works from any of the three, because it cannot say "wrong
application" without saying "this account exists". The use case issues the
session for the account's own application, and if that is not this one the
action sends them to their own application's sign-in instead of setting a cookie
this application cannot read. An invite always opens in the doctor app, because
doctors are the only accounts administration invites. An address-change link
opens in the application of the account that asked.

## 3. Three independent reasons a cookie does not cross

1. **The cookie name.** Each application reads only its own. In development all
   four share `localhost`, where cookies are not isolated by port, so without
   this one application's sign-out would delete another's cookie.
2. **The session audience.** `sessions.audience` names the issuing application,
   and `resolveActor` will not match across it. A token presented under the
   right cookie name at the wrong application resolves to nobody.
3. **The route table.** Each application has its own (`DOCTOR_ROUTE_RULES`,
   `CENTRE_ROUTE_RULES`, `VOLUNTEER_ROUTE_RULES`, `ADMIN_ROUTE_RULES`), and a
   role that does not belong to the application is refused before any rule is
   read. A path with no rule is denied, so the doctor app has no `/centre` a
   misconfigured role could be let into.

`decideAccess`, `accessFor` and `resolveActor` no longer default to an audience.
A default is how a caller ends up checking the wrong application without
noticing.

## 4. The migration

`0022_sessions_name_their_application` replaces `'staff'` in the CHECK with the
three new audiences and drops the column default. Existing rows are moved to the
audience of their account's role, revoked and expired ones included, because the
new CHECK must hold for every row. A live `'staff'` session does not become
usable by this: its cookie was `bc_session`, which nothing reads any more.
Everyone signs in again once.

## 5. The shared frame is a package

Three applications with one frame would otherwise be three copies of the session
handling, the proxy, the page guard, the header and five account pages, and the
copy that drifts is found the hard way. `packages/staff-web` holds them once,
parameterised by a `StaffApp` record (audience, cookie, name). Each application
keeps a one-line `lib/app.ts` naming itself, thin `lib/session.ts` and
`lib/guards.ts` bindings so role pages import exactly what they did before, and
its own `actions.ts`, because a `'use server'` module can only export functions,
not build them.

Two build decisions that are not obvious from the code:

- **Bundler resolution, not NodeNext.** Next's type declarations are CommonJS
  shims that NodeNext reads as a module object rather than a component.
- **No project references.** With them, the referenced packages' declarations
  are resolved under their own NodeNext settings and drizzle-orm's types load
  twice, as ESM and as CommonJS, which makes `SQL` unassignable to itself. The
  root `tsconfig.json` lists the package last, so `tsc -b` still builds what it
  imports first.

A new boundary rule, `the-shared-frame-holds-no-role`, stops the package
importing `hospital`, `centre`, `volunteer`, `bot` or `ops`. A role's screens and
rules stay in that role's application.

Administration keeps its own copies. It already had them (ADR 0003), its account
pages differ, and moving it is a separate change with nothing to gain here.

## 6. What else moved

- **Environment.** `STAFF_APP_URL` is gone. `DOCTOR_APP_URL`, `CENTRE_APP_URL`
  and `VOLUNTEER_APP_URL` join `ADMIN_APP_URL`, read in one place,
  `appOrigin()` in `packages/platform`, with the development ports as defaults.
- **Metrics.** The `staff` surface is now `doctor`, `centre` and `volunteer`, so
  the panel says which application is failing. Old `staff` samples fall out of
  the window rather than being rewritten.
- **Alerts.** `Alert.app` names the application; the centre's alerts link into
  the centre app.
- **Cross-origin.** No CORS policy is needed or set: nothing in a browser calls
  another application by script, and every server action posts to its own origin.
  What crosses between the applications is navigation. A reverse proxy must pass
  the public `Host` through, or the same-origin check refuses every form. The
  reasoning is in the architecture plan's §13.
- **Metadata.** The root layout's metadata stays application-neutral. It wraps
  the 403 page, which must carry nothing about who is asking. The application's
  name is in the header, the sign-in title and each manifest instead.

## 7. A defect found on the way past

The first production build of the centre app failed. `centre-collision-forms.tsx`
is a client component, and since P6 it had imported `allowedOutcomes` and
`defaultOutcome` from `@blood-connect/centre`, which brings the database driver
and Argon2 into a browser bundle. In development this did not look like a
compile error. It looked like an `ENOENT` for a `build-manifest.json` on
`/centre/stock`, `/centre/tags`, `/centre/quarantine` and
`/centre/demands/[id]`, which is the symptom `pnpm clean:next` was written for,
so it was read as a stale cache.

The two functions are pure, and their comment already said the screen needs
them. They now live in `packages/domain` with their types, `centre` re-exports
them, and the form imports them from `domain`. All four pages render, and the
README now says to run a production build when a cleaned cache does not fix
the error.

## 8. Landing on the kit

This change was written against the UX4G screens and merged after
[ADR 0015](0015-ux4g-replaced-by-in-repo-clinical-kit.md) had replaced them
with the in-repo kit. The kit's screens take priority: every page the split
moved carries the kit restyle it received on `main`, and the shared frame was
rewritten onto the kit rather than keeping a UX4G copy alive in one package.

What that changed in §5:

- `packages/staff-web` imports `@blood-connect/ui`. The
  `nothing-depends-on-ui-except-apps` rule admits it by name, because the frame
  is presentation that happens to live in a package, and
  `ui-is-presentation-only` now also keeps the kit out of `staff-web`.
- The shell is the kit's `AppShell`, wrapped once in `staff-web` as `AppFrame`.
  Each application keeps a thin `kit-shell.tsx`, which is what its pages
  import, and a `nav.ts` listing only its own role's surfaces. The nav for a
  role lives in that role's application, not in a table of four.
- The public pages (sign-in, reset, invite, address confirmation) have no
  shell, as the kit's versions had none. Their brand line names the
  application, which is where §2's "whose sign-in is this" now reads.
- Tailwind is per application. Each `tailwind.css` lists `packages/staff-web/src`
  as a second `@source`, or the frame's classes are never generated.
- UX4G is gone from the three applications and from the package, including
  `theme.css` and the runtime shim.

§7's defect was fixed on `main` in parallel, by moving the two functions to
`packages/centre/src/rules/returns.ts` behind a subpath export. This merge keeps
the `packages/domain` home and drops that subpath: the rule is pure, `domain` is
where the other pure rules are, and one home is one fewer place for the form and
the refusal to disagree.
