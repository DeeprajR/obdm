import Link from 'next/link';

import { appOrigin } from '@blood-connect/platform';

import { STAFF_APPS, type StaffApp } from './app.js';
import { SignInForm } from './client/sign-in-form.js';
import type { SignInAction } from './form-state.js';

/**
 * The sign-in card, for one application.
 *
 * Accounts are provisioned by an administrator; there is no sign-up page
 * (§2.2). A first sign-in happens on the emailed invite link.
 *
 * Each application admits one role, and an account at the wrong one is refused
 * exactly like a wrong password (§15), so the card says whose it is, and says
 * where the other two are. That is the whole of the routing: it names places,
 * and it never learns anything about the address typed into it.
 */
export function SignInCard({ app, action }: { app: StaffApp; action: SignInAction }) {
  const others = STAFF_APPS.filter((other) => other.audience !== app.audience);

  return (
    <>
      <div className="ux4g-card ux4g-card-outline">
        <div className="ux4g-card-header">
          <h1 className="ux4g-card-title">Sign in</h1>
          <p className="ux4g-card-sub-title">
            For {app.who}. Use the account your administrator created for you.
          </p>
        </div>

        <div className="ux4g-card-body">
          <SignInForm action={action} />
        </div>

        <div className="ux4g-card-footer">
          <Link className="ux4g-btn ux4g-btn-text-primary ux4g-btn-md" href="/reset">
            Forgot your password?
          </Link>
        </div>
      </div>

      <nav className="app-row" aria-label="Other Blood Connect applications">
        {others.map((other) => (
          <a
            key={other.audience}
            className="ux4g-btn ux4g-btn-text-primary ux4g-btn-md"
            href={`${appOrigin(other.audience)}/sign-in`}
          >
            Sign in for {other.who}
          </a>
        ))}
      </nav>
    </>
  );
}
