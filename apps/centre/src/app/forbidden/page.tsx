import type { Metadata } from 'next';

import { ForbiddenScreen } from '@obdm/staff-web';

export const metadata: Metadata = { title: 'Not available · OBDM' };

/** 403. Renders no data at all (§14). */
export default function ForbiddenPage() {
  return <ForbiddenScreen />;
}
