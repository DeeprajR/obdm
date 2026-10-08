import { ChoosePasswordForm } from './client/forms.js';
import type { FormAction } from './form-state.js';

/**
 * The invite link (§2.3, §8).
 *
 * Public by necessity: the person opening it has no account yet. The token in
 * the path is the whole credential, so it is single-use, short-lived, and
 * superseded the moment a new invite is sent. The page binds it to the
 * application's activate action before handing that action in here.
 */
export function InviteCard({
  minimumLength,
  action,
}: {
  minimumLength: number;
  action: FormAction;
}) {
  return (
    <div className="ux4g-card ux4g-card-outline">
      <div className="ux4g-card-header">
        <h1 className="ux4g-card-title">Choose a password</h1>
        <p className="ux4g-card-sub-title">
          This signs you in and takes you to your dashboard.
        </p>
      </div>
      <div className="ux4g-card-body">
        <ChoosePasswordForm
          action={action}
          minimumLength={minimumLength}
          label="Set password and sign in"
        />
      </div>
    </div>
  );
}
