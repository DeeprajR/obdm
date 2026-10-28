import Link from 'next/link';

import { Card } from '@obdm/ui';
import { appOrigin } from '@obdm/platform';

import { STAFF_APPS, type StaffApp } from './app.js';
import { DemoEntryForm, SignInForm } from './client/sign-in-form.js';
import { demoAccount } from './demo.js';
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
 *
 * While the deployment opens a demonstration account (`demoAccount`), the
 * page leads with one button into it, and the password form folds away
 * below for anyone who has an account of their own.
 */
export function SignInCard({
  app,
  action,
  demoAction,
}: {
  app: StaffApp;
  action: SignInAction;
  demoAction?: SignInAction;
}) {
  const others = STAFF_APPS.filter((other) => other.audience !== app.audience);
  const demo = demoAction !== undefined && demoAccount() !== null;

  return (
    <PublicPage app={app} subtitle={`Sign in for ${app.who}`} width="sm">
      {demo ? (
        <Card>
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-ink-muted">
              <p className="font-medium text-ink">Try it without an account</p>
              <p>
                This prototype is open for testing. The demo account is shared by everyone
                trying it, so anything entered here is seen by all of them. Use made-up
                details only, never a real patient&rsquo;s.
              </p>
            </div>
            <DemoEntryForm action={demoAction} />
          </div>
        </Card>
      ) : null}

      {demo ? (
        <details className="rounded-card border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Sign in with your own account
          </summary>
          <div className="mt-4">
            <SignInForm action={action} />
          </div>
        </details>
      ) : (
        <Card>
          <SignInForm action={action} />
        </Card>
      )}

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
