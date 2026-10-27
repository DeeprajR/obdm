import type { Metadata } from 'next';

import { OfflineScreen } from '@obdm/staff-web';

export const metadata: Metadata = { title: 'Offline · OBDM' };

/** Rendered statically so the service worker can cache it at install time (§2.8). */
export const dynamic = 'force-static';

export default function OfflinePage() {
  return <OfflineScreen />;
}
