import type { Metadata } from 'next';

import { ConfirmEmailOutcome } from '@blood-connect/staff-web';

import { AppShell } from '../../shell';
import { currentActor } from '@/lib/session';

export const metadata: Metadata = { title: 'Confirm your address · Blood Connect' };

/**
 * The address-change confirmation (§3). Usable while signed out on purpose:
 * the new inbox may be on a phone that has never signed in.
 */
export default async function ConfirmEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const actor = await currentActor();

  return (
    <AppShell actor={actor} title="Confirm your address" narrow>
      <ConfirmEmailOutcome token={token} />
    </AppShell>
  );
}
