import Link from 'next/link';

import { linkButtonClasses } from '@blood-connect/ui';
import { anonymousActor, confirmEmailChange } from '@blood-connect/platform';

import type { StaffApp } from './app.js';
import { useCaseContext } from './guards.js';
import { PublicPage } from './public-page.js';

const LINK_PRIMARY = linkButtonClasses({ variant: 'primary', size: 'lg' });

/**
 * The address-change confirmation (§3).
 *
 * Applied on open rather than behind a button. The person has already made the
 * decision, twice, once when requesting it and once by opening a link that
 * only reaches the address being claimed, and a second confirmation step is a
 * chance to abandon the flow half-done.
 *
 * Usable while signed out on purpose: the new inbox may be on a phone that has
 * never signed in, and requiring a session would strand exactly that person.
 */
export async function ConfirmEmailOutcome({ app, token }: { app: StaffApp; token: string }) {
  const ctx = await useCaseContext(anonymousActor);
  const result = await confirmEmailChange(ctx, token);

  return (
    <PublicPage app={app} subtitle="Confirm your address">
      {result.ok ? (
        <div
          role="status"
          className="rounded-card border border-success/30 bg-success-soft p-4"
        >
          <h1 className="text-base font-semibold text-ink">Address changed</h1>
          <p className="mt-1 text-sm text-ink">
            Your account now uses{' '}
            <span className="font-medium">{result.value.newEmail}</span>.
            Sign in with it from now on.
          </p>
        </div>
      ) : (
        <div
          role="alert"
          className="rounded-card border border-danger/30 bg-danger-soft p-4"
        >
          <h1 className="text-base font-semibold text-danger">
            That link cannot be used
          </h1>
          <p className="mt-1 text-sm text-ink">{result.error.message}</p>
        </div>
      )}

      <Link href="/sign-in" className={LINK_PRIMARY}>
        Go to sign in
      </Link>
    </PublicPage>
  );
}
