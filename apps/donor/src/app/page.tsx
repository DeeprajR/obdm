import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { linkButtonClasses } from '@obdm/ui';

export const metadata: Metadata = {
  title: 'OBDM · Open Blood Donation Management',
  description:
    'Blood requests, the blood centre’s answers, and the donors who cover what the shelf could not.',
  // The landing page is the one page here a search result may show. The chat
  // keeps the layout's noindex.
  robots: { index: true, follow: true },
};

/** The staff origins are read when the page is served, not when it is built. */
export const dynamic = 'force-dynamic';

const PUBLIC_ID = /^[A-Za-z0-9_-]{4,64}$/;

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

const STAFF = [
  {
    variable: 'DOCTOR_APP_URL',
    devPort: 3000,
    title: 'Doctors',
    text: 'Raise a blood request for a patient and follow it to the end.',
  },
  {
    variable: 'CENTRE_APP_URL',
    devPort: 3002,
    title: 'Blood centre',
    text: 'Answer requests from stock, hand units over, and receive donors.',
  },
  {
    variable: 'VOLUNTEER_APP_URL',
    devPort: 3003,
    title: 'Volunteer coordinators',
    text: 'See which groups are short and how many donors are coming.',
  },
  {
    variable: 'ADMIN_APP_URL',
    devPort: 3001,
    title: 'Administration',
    text: 'Invite staff, manage accounts, and watch the system’s health.',
  },
] as const;

/**
 * The landing page for the whole system, on the bare name.
 *
 * It points each kind of visitor at their own application: a donor at the
 * chat on this origin, staff at the sign-in of theirs. Each application is a
 * separate origin (§13), so these are full links, not routes.
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
    return origin ? [{ ...app, href: `${origin}/sign-in` }] : [];
  });

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
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
        </div>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-4 py-10">
        <section aria-labelledby="donors" className="flex flex-col gap-4">
          <h1 id="donors" className="text-2xl font-semibold text-ink sm:text-3xl">
            Blood for patients who need it, from donors nearby
          </h1>
          <p className="max-w-2xl text-ink-muted">
            Doctors ask for blood, the blood centre answers from what is on the shelf, and
            donors are asked for whatever it could not cover. Register once, and we message you
            only when a patient near you needs your group.
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

        {staff.length > 0 ? (
          <section aria-labelledby="staff" className="flex flex-col gap-4">
            <h2 id="staff" className="text-lg font-semibold text-ink">
              Hospital staff
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {staff.map((app) => (
                <li key={app.variable}>
                  <a
                    href={app.href}
                    className="flex h-full flex-col gap-1 rounded-card border border-border bg-surface p-4 no-underline transition-colors hover:border-border-strong hover:bg-surface-muted"
                  >
                    <span className="font-medium text-ink">{app.title}</span>
                    <span className="text-sm text-ink-muted">{app.text}</span>
                    <span className="mt-2 text-sm font-medium text-primary">Sign in →</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-border bg-surface">
        <p className="mx-auto max-w-4xl px-4 py-4 text-xs text-ink-subtle">
          Not a medical device. This system does not make clinical decisions; the pre-donation
          assessment and the pre-transfusion compatibility test always happen on site. Running
          on synthetic data, no real patient or donor record.
        </p>
      </footer>
    </div>
  );
}
