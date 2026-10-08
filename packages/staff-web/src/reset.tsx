import Link from 'next/link';

import { CompleteResetForm, RequestResetForm } from './client/forms.js';
import type { FormAction } from './form-state.js';

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
  minimumLength,
  requestAction,
  completeAction,
}: {
  minimumLength: number;
  requestAction: FormAction;
  completeAction: FormAction;
}) {
  return (
    <>
      <div className="ux4g-card ux4g-card-outline">
        <div className="ux4g-card-header">
          <h1 className="ux4g-card-title">Send me a code</h1>
          <p className="ux4g-card-sub-title">
            We will email a six-digit code to the address on your account.
          </p>
        </div>
        <div className="ux4g-card-body">
          <RequestResetForm action={requestAction} />
        </div>
      </div>

      <div className="ux4g-card ux4g-card-outline">
        <div className="ux4g-card-header">
          <h2 className="ux4g-card-title">I have a code</h2>
          <p className="ux4g-card-sub-title">
            Setting a new password signs you in and ends every other session.
          </p>
        </div>
        <div className="ux4g-card-body">
          <CompleteResetForm action={completeAction} minimumLength={minimumLength} />
        </div>
      </div>

      <Link className="ux4g-btn ux4g-btn-text-primary ux4g-btn-md" href="/sign-in">
        Back to sign in
      </Link>
    </>
  );
}
