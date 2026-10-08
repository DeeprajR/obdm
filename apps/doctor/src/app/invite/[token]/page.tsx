import type { Metadata } from 'next';

import { InviteCard } from '@blood-connect/staff-web';
import { currentConfig } from '@blood-connect/platform';

import { AppShell } from '../../shell';
import { activateAction } from '../../actions';
import { currentActor } from '@/lib/session';

export const metadata: Metadata = { title: 'Set your password · Blood Connect' };

/** The invite link (§2.3, §8). Public by necessity: there is no account yet. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await currentActor();
  const config = await currentConfig();

  return (
    <AppShell actor={actor} title="Set your password" narrow>
      <InviteCard
        minimumLength={config.auth.minPasswordLength}
        action={activateAction.bind(null, token)}
      />
    </AppShell>
  );
}
