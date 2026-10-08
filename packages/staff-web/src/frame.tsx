import type { ReactNode } from 'react';
import Link from 'next/link';

import type { Actor, UserRole } from '@blood-connect/platform';
import { db, findAccountById } from '@blood-connect/platform';

import type { StaffApp } from './app.js';
import { SignOutButton } from './client/sign-out-button.js';

const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  doctor: 'Doctor',
  admin: 'Administrator',
  blood_centre: 'Blood centre',
  volunteer_admin: 'Volunteer admin',
};

/**
 * The application frame.
 *
 * Deliberately thin. The spec's non-functional rules ask for one filled primary
 * action per screen and a single column of content (§10), and a heavy chrome
 * competes with both. What belongs in a header here is which system this is
 * and who you are signed in as: the three staff applications look alike, and a
 * shared workstation is exactly where the wrong one, or the wrong account,
 * goes unnoticed.
 *
 * The name and address are read here rather than threaded through every page.
 * One query per render against a row the session already resolved, and the
 * alternative is a prop added to twenty call sites that all mean the same
 * thing.
 *
 * Each application wraps this in its own `AppShell`, which supplies the
 * `StaffApp` and the sign-out action, so a page never passes either.
 */
export async function AppFrame({
  app,
  actor,
  title,
  children,
  narrow = false,
  signOutAction,
}: {
  app: StaffApp;
  actor: Actor;
  title: string;
  children: ReactNode;
  narrow?: boolean;
  signOutAction: () => Promise<void>;
}) {
  const account = actor.kind === 'user' ? await findAccountById(db, actor.userId) : undefined;

  return (
    <div className="app-page">
      <header className="app-header">
        <div className="app-header-identity">
          <Link href="/" className="ux4g-heading-xs-strong">
            Blood Connect
          </Link>
          <span className="ux4g-label-m-strong">{app.name}</span>
          <span className="ux4g-label-m-default">{title}</span>
        </div>

        {actor.kind === 'user' ? (
          <div className="app-row app-account">
            <Link className="app-account-identity" href="/profile">
              <span className="ux4g-label-m-strong">{account?.fullName ?? 'Your account'}</span>
              <span className="ux4g-label-s-default app-account-email">
                {account?.email ?? ROLE_LABELS[actor.role]}
              </span>
            </Link>
            <span className="ux4g-label-m-default">{ROLE_LABELS[actor.role]}</span>
            <SignOutButton action={signOutAction} />
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-md app-target"
          >
            Sign in
          </Link>
        )}
      </header>

      <main id="main" className={narrow ? 'app-main app-main-narrow' : 'app-main'}>
        {children}
      </main>

      <footer className="app-footer">
        {/*
         * The medical disclaimer stays prominent regardless of the audience
         * (§12.6), and the synthetic-data statement is a property to state
         * plainly rather than a limitation to apologise for.
         */}
        <p className="ux4g-label-s-default">
          Not a medical device. This system does not make clinical decisions; the
          pre-donation assessment and the pre-transfusion compatibility test always happen
          on site. Running on synthetic data, no real patient or donor record.
        </p>
      </footer>
    </div>
  );
}
