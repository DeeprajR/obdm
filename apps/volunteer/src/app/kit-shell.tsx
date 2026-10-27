import 'server-only';

import type { ReactNode } from 'react';
import type { UserRole } from '@obdm/platform';
import { AppFrame } from '@obdm/staff-web';
import { SignOutButton } from '@obdm/staff-web/client';

import { APP } from '@/lib/app';
import { signOutAction } from './actions';
import { PRIMARY_NAV, SECONDARY_NAV } from './nav';

/**
 * The kit-styled application shell (ADR 0015), for this application.
 *
 * The frame itself is shared (`AppFrame` in `@obdm/staff-web`); this
 * supplies the three things that make it this application's: which
 * application it is, its nav rail, and the sign-out action that clears this
 * application's cookie (ADR 0016).
 */
export function KitShell({
  role,
  userId,
  currentPath,
  currentTitle,
  children,
}: {
  role: UserRole;
  /** The signed-in account, named in the sidebar. */
  userId?: string;
  /** The page's own path, e.g. `/dashboard`. Read as-is by the sidebar
   * to mark the active nav item. */
  currentPath: string;
  /** Shown in the sticky header. Usually the same phrase as the H1 the
   * page renders under `PageHeader`. */
  currentTitle: string;
  children: ReactNode;
}) {
  return (
    <AppFrame
      app={APP}
      role={role}
      {...(userId === undefined ? {} : { userId })}
      primaryNav={PRIMARY_NAV}
      secondaryNav={SECONDARY_NAV}
      currentPath={currentPath}
      currentTitle={currentTitle}
      signOutSlot={<SignOutButton action={signOutAction} />}
    >
      {children}
    </AppFrame>
  );
}
