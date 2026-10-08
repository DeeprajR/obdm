import type { Metadata } from 'next';

import { ResetCards } from '@blood-connect/staff-web';
import { currentConfig } from '@blood-connect/platform';

import { completeResetAction, requestResetAction } from '../actions';
import { APP } from '@/lib/app';

export const metadata: Metadata = { title: 'Reset your password · Blood Connect' };

/** Password reset (§3). Public: the person resetting cannot sign in. */
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
