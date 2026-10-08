import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SignInCard } from '@blood-connect/staff-web';
import { landingFor } from '@blood-connect/platform';

import { signInAction } from '../actions';
import { APP } from '@/lib/app';
import { currentActor } from '@/lib/session';

export const metadata: Metadata = { title: `Sign in · ${APP.name} · Blood Connect` };

/**
 * This application's sign-in. Only its own role can sign in here (ADR 0016);
 * any other account is refused exactly like a wrong password.
 *
 * No app shell: an unauthenticated visitor has no navigation to speak of, so
 * a centred card on the canvas is the whole page (ADR 0015).
 */
export default async function SignInPage() {
  const actor = await currentActor();

  // Already signed in: send them where they were going rather than showing a
  // form for an account they are already using.
  if (actor.kind === 'user') redirect(landingFor(actor.role));

  return <SignInCard app={APP} action={signInAction} />;
}
