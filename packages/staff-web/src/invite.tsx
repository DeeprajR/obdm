import { Card } from '@blood-connect/ui';

import type { StaffApp } from './app.js';
import { ChoosePasswordForm } from './client/forms.js';
import type { FormAction } from './form-state.js';
import { PublicPage } from './public-page.js';

/**
 * The invite link (§2.3, §8).
 *
 * Public by necessity: the person opening it has no account yet. The token in
 * the path is the whole credential, so it is single-use, short-lived, and
 * superseded the moment a new invite is sent. The page binds it to the
 * application's activate action before handing that action in here.
 */
export function InviteCard({
  app,
  minimumLength,
  action,
}: {
  app: StaffApp;
  minimumLength: number;
  action: FormAction;
}) {
  return (
    <PublicPage app={app} subtitle="Set your password">
      <Card title="Choose a password">
        <p className="mb-4 text-xs text-ink-subtle">
          This signs you in and takes you to your dashboard.
        </p>
        <ChoosePasswordForm
          action={action}
          minimumLength={minimumLength}
          label="Set password and sign in"
        />
      </Card>
    </PublicPage>
  );
}
