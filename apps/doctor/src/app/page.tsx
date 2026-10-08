import { Landing } from '@blood-connect/staff-web';

import { APP } from '@/lib/app';
import { currentActor } from '@/lib/session';

/** The landing page. Public (§9's role matrix, row one). */
export default async function LandingPage() {
  const actor = await currentActor();

  return <Landing app={APP} actor={actor} />;
}
