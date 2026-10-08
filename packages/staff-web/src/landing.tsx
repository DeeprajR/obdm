import Link from 'next/link';

import { linkButtonClasses } from '@blood-connect/ui';
import { appOrigin, landingFor, type Actor } from '@blood-connect/platform';

import type { StaffApp } from './app.js';

/**
 * The landing page. Public (§9's role matrix, row one).
 *
 * Two doors and nothing else: the board anyone may read, and the sign-in for
 * people with an account. A landing page that explains the system at length is
 * a landing page nobody in a hurry reads.
 *
 * No app shell here, even for signed-in visitors: the shell needs a role to
 * render a nav rail, and this page is one of the two the anonymous matrix row
 * reaches. Signed-in visitors get a "Continue" button that lands them where
 * their role usually goes.
 *
 * The board lives in the volunteer application (ADR 0016), so from the other
 * two it is a link to another origin rather than a route of their own.
 */
export function Landing({ app, actor }: { app: StaffApp; actor: Actor }) {
  const board = app.audience === 'volunteer' ? '/board' : `${appOrigin('volunteer')}/board`;

  // `whitespace-nowrap` is page-specific (these two sit side by side in a
  // flex row and must not wrap), so it is passed as extra className rather
  // than baked into the shared `linkButtonClasses` shape.
  const linkPrimary = linkButtonClasses({
    variant: 'primary',
    size: 'lg',
    className: 'whitespace-nowrap',
  });
  const linkSecondary = linkButtonClasses({
    variant: 'secondary',
    size: 'lg',
    className: 'whitespace-nowrap',
  });

  return (
    <div
      id="main"
      className="flex min-h-dvh items-center justify-center bg-canvas p-6"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-control bg-primary text-lg font-bold text-white">
          B
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Blood Connect
          </h1>
          <p className="text-sm font-medium text-ink-muted">For {app.who}</p>
          <p className="text-sm text-ink-muted">
            Blood requests, centre inventory and donor recruitment for a
            medical-college hospital.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          {actor.kind === 'user' ? (
            <Link className={linkPrimary} href={landingFor(actor.role)}>
              Continue
            </Link>
          ) : (
            <Link className={linkPrimary} href="/sign-in">
              Sign in
            </Link>
          )}
          <a className={linkSecondary} href={board}>
            Open demand board
          </a>
        </div>
      </div>
    </div>
  );
}
