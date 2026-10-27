import type { Metadata } from 'next';

import { InviteCard } from '@obdm/staff-web';
import { currentConfig } from '@obdm/platform';

import { activateAction } from '../../actions';
import { APP } from '@/lib/app';

export const metadata: Metadata = { title: 'Set your password · OBDM' };

/** The invite link (§2.3, §8). Public by necessity: there is no account yet. */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const config = await currentConfig();

  return (
    <InviteCard
      app={APP}
      minimumLength={config.auth.minPasswordLength}
      action={activateAction.bind(null, token)}
    />
  );
}
