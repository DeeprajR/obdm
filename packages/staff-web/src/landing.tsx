import Link from 'next/link';

import { appOrigin, landingFor, type Actor } from '@blood-connect/platform';

import type { StaffApp } from './app.js';

/**
 * The landing page. Public (§9's role matrix, row one).
 *
 * Two doors and nothing else: the board anyone may read, and the sign-in for
 * people with an account. A landing page that explains the system at length is
 * a landing page nobody in a hurry reads.
 *
 * The board lives in the volunteer application (ADR 0016), so from the other
 * two it is a link to another origin rather than a route of their own.
 */
export function Landing({ app, actor }: { app: StaffApp; actor: Actor }) {
  const board = app.audience === 'volunteer' ? '/board' : `${appOrigin('volunteer')}/board`;

  return (
    <>
      <div className="app-stack-tight">
        <h1 className="ux4g-heading-l-strong">Blood Connect for {app.who}</h1>
        <p className="ux4g-body-m-default">
          Blood requests, centre inventory and donor recruitment for a medical-college
          hospital.
        </p>
      </div>

      <div className="app-row">
        {actor.kind === 'user' ? (
          <Link
            className="ux4g-btn ux4g-btn-primary ux4g-btn-lg app-target"
            href={landingFor(actor.role)}
          >
            Continue
          </Link>
        ) : (
          <Link
            className="ux4g-btn ux4g-btn-primary ux4g-btn-lg app-target"
            href="/sign-in"
          >
            Sign in
          </Link>
        )}

        <a className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-lg app-target" href={board}>
          Open demand board
        </a>
      </div>
    </>
  );
}
