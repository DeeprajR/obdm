import Link from 'next/link';

import { Card } from '@obdm/ui';
import { appOrigin } from '@obdm/platform';

import { STAFF_APPS, type StaffApp } from './app.js';
import { SignInForm } from './client/sign-in-form.js';
import type { SignInAction } from './form-state.js';
import { PublicPage } from './public-page.js';

/**
 * The sign-in page, for one application.
 *
 * Accounts are provisioned by an administrator; there is no sign-up page
 * (§2.2). A first sign-in happens on the emailed invite link.
 *
 * Each application admits one role, and an account at the wrong one is refused
 * exactly like a wrong password (§15), so the page says whose it is, and says
 * where the other two are. That is the whole of the routing: it names places,
 * and it never learns anything about the address typed into it.
 */
export function SignInCard({ app, action }: { app: StaffApp; action: SignInAction }) {
  const others = STAFF_APPS.filter((other) => other.audience !== app.audience);

  return (
    <PublicPage app={app} subtitle={`Sign in for ${app.who}`} width="sm">
      <Card>
        <SignInForm action={action} />
      </Card>

      <div className="text-center text-sm">
        <Link
          href="/reset"
          className="font-medium text-primary hover:underline"
        >
          Forgot your password?
        </Link>
      </div>

      <nav
        aria-label="Other OBDM applications"
        className="flex flex-col items-center gap-1 text-center text-sm"
      >
        {others.map((other) => (
          <a
            key={other.audience}
            href={`${appOrigin(other.audience)}/sign-in`}
            className="text-ink-muted hover:text-ink hover:underline"
          >
            Sign in for {other.who}
          </a>
        ))}
      </nav>
    </PublicPage>
  );
}
