import Link from 'next/link';

import { Card } from '@blood-connect/ui';

import type { StaffApp } from './app.js';
import { CompleteResetForm, RequestResetForm } from './client/forms.js';
import type { FormAction } from './form-state.js';
import { PublicPage } from './public-page.js';

/**
 * Password reset in four steps (§3): enter the address, receive a six-digit
 * code, enter it, set a new password.
 *
 * Both forms are on one page rather than behind a wizard, because the code
 * arrives in a different application and coming back to a half-finished flow is
 * the normal case, not the exception. Someone who already has a code can go
 * straight to the second form.
 *
 * The rule that shapes all of it: the response to "send me a code" is identical
 * whether or not the address exists. A reset form must not become an
 * account-enumeration oracle. Which is also why it works from any of the three
 * applications: it cannot say "wrong application" without saying "this
 * account exists", so a reset finished in the wrong one ends at the right
 * one's sign-in instead.
 */
export function ResetCards({
  app,
  minimumLength,
  requestAction,
  completeAction,
}: {
  app: StaffApp;
  minimumLength: number;
  requestAction: FormAction;
  completeAction: FormAction;
}) {
  return (
    <PublicPage app={app} subtitle="Reset your password">
      <Card title="Send me a code">
        <p className="mb-4 text-xs text-ink-subtle">
          We will email a six-digit code to the address on your account.
        </p>
        <RequestResetForm action={requestAction} />
      </Card>

      <Card title="I have a code">
        <p className="mb-4 text-xs text-ink-subtle">
          Setting a new password signs you in and ends every other session.
        </p>
        <CompleteResetForm action={completeAction} minimumLength={minimumLength} />
      </Card>

      <div className="text-center">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    </PublicPage>
  );
}
