import type { ReactNode } from 'react';

import { AppFrame } from '@blood-connect/staff-web';
import type { Actor } from '@blood-connect/platform';

import { APP } from '@/lib/app';
import { signOutAction } from './actions';

/**
 * The frame every page in this application renders inside.
 *
 * The frame itself is shared (`AppFrame`); this supplies the two things that
 * make it this application's: which application it is, for the header, and
 * the sign-out action that clears this application's cookie.
 */
export function AppShell({
  actor,
  title,
  children,
  narrow = false,
}: {
  actor: Actor;
  title: string;
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <AppFrame app={APP} actor={actor} title={title} narrow={narrow} signOutAction={signOutAction}>
      {children}
    </AppFrame>
  );
}
