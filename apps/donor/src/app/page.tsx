import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { linkButtonClasses } from '@obdm/ui';

export const metadata: Metadata = {
  title: 'OBDM · Open Blood Donation Management',
  description:
    'A working prototype of a hospital blood request and donor recruitment system: requests, the blood centre’s answers, and donors for what the shelf could not cover.',
  // The landing page is the one page here a search result may show. The chat
  // keeps the layout's noindex.
  robots: { index: true, follow: true },
};

/** The staff origins are read when the page is served, not when it is built. */
export const dynamic = 'force-dynamic';

const PUBLIC_ID = /^[A-Za-z0-9_-]{4,64}$/;

const REPOSITORY = 'https://github.com/DeeprajR/obdm';

/**
 * Where a staff application lives. In production each is configured, and an
 * unconfigured one is left off the page rather than linked to localhost; in
 * development it falls back to the port `pnpm dev` serves it on.
 */
function appOrigin(variable: string, devPort: number): string | null {
  const configured = process.env[variable];
  if (configured) return configured.replace(/\/+$/, '');
  return process.env.NODE_ENV === 'production' ? null : `http://localhost:${String(devPort)}`;
}

const hostOf = (origin: string): string => origin.replace(/^https?:\/\//, '');

const STAFF = [
  {
    variable: 'DOCTOR_APP_URL',
    devPort: 3000,
    title: 'Doctors',
    who: 'Ward doctors',
    text: 'Raise a blood request for a patient, follow it to the end, record the crossmatch sample, and cancel it if it is no longer needed.',
  },
  {
    variable: 'CENTRE_APP_URL',
    devPort: 3002,
    title: 'Blood centre',
    who: 'Blood centre staff',
    text: 'Answer requests from stock, hand units over, handle returns and quarantine, recruit donors for a shortfall, and receive them at the counter.',
  },
  {
    variable: 'VOLUNTEER_APP_URL',
    devPort: 3003,
    title: 'Volunteer coordinators',
    who: 'Volunteer and donor-drive coordinators',
    text: 'See which groups are short across the district and how many donors are on their way, without seeing who any patient or donor is.',
  },
  {
    variable: 'ADMIN_APP_URL',
    devPort: 3001,
    title: 'Administration',
    who: 'System administrators',
    text: 'Invite staff, manage accounts and their changes, and watch the health of the whole system from the control panel.',
  },
] as const;

const STEPS = [
  {
    title: 'A doctor asks',
    text: 'A ward doctor raises a request for a patient: the blood group, the product, how many units and how soon.',
  },
  {
    title: 'The blood centre answers',
    text: 'The centre answers from what is on the shelf. The units are held for that patient and handed over when they leave the fridge.',
  },
  {
    title: 'Donors are asked for the rest',
    text: 'If the shelf cannot cover it, registered donors nearby with a matching group are messaged, asked a few health questions, and told where to come.',
  },
  {
    title: 'Everyone hears how it ended',
    text: 'Donors are thanked, stood down if they are no longer needed, and the doctor sees the outcome on the request.',
  },
] as const;

/**
 * The landing page for the whole system, on the bare name.
 *
 * What OBDM is, the applications inside it and how each is reached, and that
 * it is a prototype. Each application is a separate origin (§13), so the
 * staff entries are full links to their sign-in, not routes.
 *
 * `?r=<public id>` used to land on the chat at `/`, and links already printed
 * or forwarded still carry it, so it is passed on to the chat.
 */
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const link = (await searchParams)['r'];
  if (typeof link === 'string' && PUBLIC_ID.test(link)) {
    redirect(`/chat?r=${encodeURIComponent(link)}`);
  }

  const volunteer = appOrigin('VOLUNTEER_APP_URL', 3003);
  const staff = STAFF.flatMap((app) => {
    const origin = appOrigin(app.variable, app.devPort);
    return origin ? [{ ...app, origin }] : [];
  });

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-control bg-primary text-sm font-bold text-white"
          >
            O
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-ink">OBDM</p>
            <p className="truncate text-xs text-ink-subtle">Open Blood Donation Management</p>
          </div>
          <nav aria-label="On this page" className="ml-auto hidden gap-4 text-sm sm:flex">
            <a href="#how" className="text-ink-muted hover:text-ink">How it works</a>
            <a href="#apps" className="text-ink-muted hover:text-ink">Applications</a>
            <a href="#access" className="text-ink-muted hover:text-ink">Access</a>
          </nav>
        </div>
      </header>

      <div
        role="note"
        aria-labelledby="prototype"
        className="border-b border-warning/30 bg-warning-soft"
      >
        <div className="mx-auto max-w-5xl px-4 py-3 text-sm text-ink">
          <p>
            <strong id="prototype" className="font-semibold">A prototype, for demonstration only.</strong>{' '}
            OBDM shows how such a system would work. It must not be used to manage real
            patients, donors or blood in any real-world setting without consultation with the
            hospital, its transfusion service, and legal and regulatory advisers. It runs on
            synthetic data.
          </p>
        </div>
      </div>

      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-14 px-4 py-10">
        <section aria-labelledby="about" className="flex flex-col gap-4">
          <h1 id="about" className="text-2xl font-semibold text-ink sm:text-3xl">
            Blood for patients who need it, from donors nearby
          </h1>
          <p className="max-w-3xl text-ink-muted">
            OBDM brings a hospital&rsquo;s blood requests, its blood centre and its volunteer
            donors into one loop. Doctors ask for blood, the blood centre answers from what is
            on the shelf, and donors nearby are asked for whatever it could not cover, then told
            how it ended.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/chat" className={linkButtonClasses({ size: 'lg' })}>
              I want to give blood
            </Link>
            {volunteer ? (
              <a
                href={`${volunteer}/board`}
                className={linkButtonClasses({ variant: 'secondary', size: 'lg' })}
              >
                See what is needed now
              </a>
            ) : null}
          </div>
        </section>

        <section id="how" aria-labelledby="how-heading" className="flex scroll-mt-4 flex-col gap-4">
          <h2 id="how-heading" className="text-lg font-semibold text-ink">
            How it works
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
                <span className="font-mono text-xs text-ink-subtle">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-medium text-ink">{step.title}</span>
                <span className="text-sm text-ink-muted">{step.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="apps" aria-labelledby="apps-heading" className="flex scroll-mt-4 flex-col gap-6">
          <h2 id="apps-heading" className="text-lg font-semibold text-ink">
            The applications
          </h2>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
              Open to everyone
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
                <span className="font-medium text-ink">Donor chat</span>
                <span className="text-sm text-ink-muted">
                  Register as a donor in about a minute, see what is needed now, and answer when
                  a patient near you needs your group. No account or password.
                </span>
                <Link href="/chat" className="mt-2 text-sm font-medium text-primary">
                  Open the donor chat →
                </Link>
              </li>
              {volunteer ? (
                <li className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
                  <span className="font-medium text-ink">Demand board</span>
                  <span className="text-sm text-ink-muted">
                    Which blood groups are short right now, and where. No patient details, ever.
                  </span>
                  <a href={`${volunteer}/board`} className="mt-2 text-sm font-medium text-primary">
                    Open the demand board →
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {staff.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 id="staff" className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
                Hospital staff
              </h3>
              <ul aria-labelledby="staff" className="grid gap-3 sm:grid-cols-2">
                {staff.map((app) => (
                  <li key={app.variable} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
                    <span className="font-medium text-ink">{app.title}</span>
                    <span className="text-xs text-ink-subtle">
                      For {app.who.toLowerCase()} · <span className="font-mono">{hostOf(app.origin)}</span>
                    </span>
                    <span className="text-sm text-ink-muted">{app.text}</span>
                    <a href={`${app.origin}/sign-in`} className="mt-2 text-sm font-medium text-primary">
                      Sign in to {app.title} →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section id="access" aria-labelledby="access-heading" className="flex scroll-mt-4 flex-col gap-3">
          <h2 id="access-heading" className="text-lg font-semibold text-ink">
            How to get access
          </h2>
          <ul className="flex max-w-3xl list-disc flex-col gap-2 pl-5 text-sm text-ink-muted">
            <li>
              <span className="text-ink">Donors</span> need no account. Open the donor chat on
              your phone and register; your browser remembers you from then on.
            </li>
            <li>
              <span className="text-ink">Hospital staff</span> are invited by an administrator.
              The invitation arrives by email; open it to choose your password, then sign in to
              your own application above. Each role has its own application and its own
              address, and an account works only in its own.
            </li>
            <li>
              <span className="text-ink">Forgotten password?</span> Doctors, blood centre staff
              and volunteer coordinators can reset it from their sign-in page. Administrator
              passwords have no self-service reset; the person who runs the deployment sets a
              new one.
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4 text-xs text-ink-subtle">
          <p>
            Not a medical device. This system does not make clinical decisions; the
            pre-donation assessment and the pre-transfusion compatibility test always happen on
            site. Running on synthetic data, no real patient or donor record.
          </p>
          <p>
            Open source:{' '}
            <a href={REPOSITORY} className="underline hover:text-ink">
              github.com/DeeprajR/obdm
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
