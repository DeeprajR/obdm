import type { Metadata } from 'next';

import { ResetCards } from '@blood-connect/staff-web';
import { currentConfig } from '@blood-connect/platform';

import { AppShell } from '../shell';
import { completeResetAction, requestResetAction } from '../actions';
import { currentActor } from '@/lib/session';

export const metadata: Metadata = { title: 'Reset your password · Blood Connect' };

/** Password reset (§3). Public: the person resetting cannot sign in. */
export default async function ResetPage() {
  const actor = await currentActor();
  const config = await currentConfig();

  return (
    <AppShell actor={actor} title="Reset your password" narrow>
      <ResetCards
        minimumLength={config.auth.minPasswordLength}
        requestAction={requestResetAction}
        completeAction={completeResetAction}
      />
    </AppShell>
  );
}
