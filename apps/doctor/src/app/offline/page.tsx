import type { Metadata } from 'next';

import { OfflineScreen } from '@blood-connect/staff-web';

export const metadata: Metadata = { title: 'Offline · Blood Connect' };

/** Rendered statically so the service worker can cache it at install time (§2.8). */
export const dynamic = 'force-static';

export default function OfflinePage() {
  return <OfflineScreen />;
}
