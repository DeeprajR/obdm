# Inbox

- [x] ~~to the plan add the c-panel dashboard where I can see health of all APIs, metrics, to the
  granular details.~~
  → Added as **P10 · Control panel** in [docs/build-plan.md](docs/build-plan.md). Health of every
  dependency checked by doing its job rather than pinging it, §11.9's silent-failure list as a
  board, per-route metrics, and a screen that follows one unit of blood end to end by correlation
  id. Administrator-only, in the admin app, with no clinical function. The hardware phases and
  demo readiness shifted to P11–P13; Milestone C moves to day ~82.

  **Built and shipped** in `fd1fad3`, recorded in
  [ADR 0014](docs/adr/0014-the-control-panel-and-what-it-cannot-see.md). Live at `/panel` in the
  administration app, with the trace screen at `/panel/trace` and the configuration view at
  `/panel/deployment`. Two things worth knowing about it: the bot publishes its own alerts across
  the schema boundary rather than the panel reading them, because the web release holds no grant
  on the bot's schema at all; and the container-stopping test earned its place on the first run by
  catching a storage tile that stayed green with MinIO stopped.

Doctor's app:
-------------
- [x] ~~Reduce the doctor's password length to 6 instead of 12.~~ `auth.min_password_length`
  defaults to 6 (`packages/config`), and stays a row a deployment can raise again.
- [x] ~~Show the name and email of the signed in doctor in the top right account section.~~ The
  sidebar's account card names the person and their address in every application (ADR 0018 §6).

Blood Centre:
-------------
- [ ] Improve the request page to show the UUID number with priority.
- [x] ~~Auto-refresh of the centre overview to show live requests instead of manual refresh.~~
  `LiveRefresh` re-runs the overview and the queue every thirty seconds in place.
- [x] ~~Delete the "Somebody is here with an ID" section from the request queue.~~ Gone; the queue
  row carries the identifier and the "Take details" action (ADR 0018 §6).
- [ ] How emergency requirements are handled from the blood bank? (ADR 0010 §: an emergency may be
  answered before the patient is attached; the debt is shown until paid.)
- [x] ~~Partial information in the request page is not being saved if the user missed
  something.~~ A rejected submit echoes every field back (`attach-patient-form.tsx`).
- [x] ~~The date picker should be simple, using YYYY, MM, DD.~~ `date-parts.tsx`.
- [x] ~~On clicking Roster, ENOENT under `apps/web/.next`.~~ Stale build output from before the
  one-app-per-role split (ADR 0016); `apps/web` no longer exists.

Donor app (was: Telegram bot):
------------------------------
The bot is a web application now (ADR 0017); the Telegram items no longer apply.
- [ ] A default menu to show live blood requirements and to volunteer without a request link.
- [ ] "Which town? Type the first few letters" offers no list: by design where the list is
  long (§5); worth a short list of the commonest places above the prompt.
- [ ] Record the walk-in is only shown once a donor has been onboarded.

Production (ADR 0018, docs/deployment.md):
------------------------------------------
- [x] ~~The worker process: email retries, bag expiry, credential sweep.~~
- [x] ~~Refuse to start unconfigured in production.~~
- [x] ~~`db:bootstrap` for a real database and its first administrator.~~
- [x] ~~Rate limit on the donor chat route.~~
- [x] ~~Security headers, container images, compose, release workflow, secret scan.~~
- [ ] Counsel's answers to open questions 3, 4, 5 and 6; privacy notice; breach runbook;
  hospital agreement; the centre's own catalogue and shelf lives (docs/deployment.md §8).

---------

Clean up the whole features and create using user stories.
