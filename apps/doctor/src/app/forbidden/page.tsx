import type { Metadata } from 'next';

import { ForbiddenScreen } from '@blood-connect/staff-web';

export const metadata: Metadata = { title: 'Not available · Blood Connect' };

/** 403. Renders no data at all (§14). */
export default function ForbiddenPage() {
  return <ForbiddenScreen />;
}
