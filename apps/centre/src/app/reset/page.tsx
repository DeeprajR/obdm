import type { Metadata } from 'next';

import { ResetCards } from '@obdm/staff-web';
import { currentConfig } from '@obdm/platform';

import { completeResetAction, requestResetAction } from '../actions';
import { APP } from '@/lib/app';

export const metadata: Metadata = { title: 'Reset your password · OBDM' };

/** Password reset (§3). Public: the person resetting cannot sign in. */
/**
 * Rendered per request, never at build. The password minimum below is a row
 * in `app_config` (§12), and a page prerendered at build time would carry the
 * value the build happened to see, or fail the build where there is no
 * database to read it from.
 */
export const dynamic = 'force-dynamic';

export default async function ResetPage() {
  const config = await currentConfig();

  return (
    <ResetCards
      app={APP}
      minimumLength={config.auth.minPasswordLength}
      requestAction={requestResetAction}
      completeAction={completeResetAction}
    />
  );
}
