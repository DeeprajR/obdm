import type { Metadata } from 'next';

import { ConfirmEmailOutcome } from '@obdm/staff-web';

import { APP } from '@/lib/app';

export const metadata: Metadata = { title: 'Confirm your address · OBDM' };

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

  return <ConfirmEmailOutcome app={APP} token={token} />;
}
