import 'server-only';

import type { ReactNode } from 'react';
import type { UserRole } from '@blood-connect/platform';
import { AppShell, type NavItem } from '@blood-connect/ui';

import type { StaffApp } from './app.js';

const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  doctor: 'Doctor',
  admin: 'Administrator',
  blood_centre: 'Blood centre',
  volunteer_admin: 'Volunteer admin',
};

export type AppFrameProps = {
  /** Which application this is: names the shell, so a shared workstation says which system it is. */
  app: StaffApp;
  role: UserRole;
  primaryNav: readonly NavItem[];
  secondaryNav: readonly NavItem[];
  /** The page's own path, e.g. `/dashboard`. Read as-is by the sidebar to mark the active nav item. */
  currentPath: string;
  /** Shown in the sticky header. Usually the same phrase as the H1 the page renders under `PageHeader`. */
  currentTitle: string;
  /** The application's own sign-out form, so it clears that application's cookie. */
  signOutSlot: ReactNode;
  children: ReactNode;
};

/**
 * The kit-styled application shell (ADR 0015), shared by the three staff
 * applications (ADR 0016).
 *
 * Wraps the `@blood-connect/ui` `AppShell` with the nav the application passes
 * in, its sign-out form, and the medical disclaimer §12.6 requires on every
 * clinical surface. Each application keeps a thin `kit-shell.tsx` that supplies
 * the three things that make the frame its own: which application it is, its
 * nav rail, and the sign-out action bound to its cookie. A page never passes
 * any of them.
 *
 * Server component so the role and nav are resolved on the server; the kit's
 * `AppShell` is a `"use client"` boundary that runs from there.
 */
export function AppFrame({
  app,
  role,
  primaryNav,
  secondaryNav,
  currentPath,
  currentTitle,
  signOutSlot,
  children,
}: AppFrameProps) {
  return (
    <AppShell
      brand={{ title: 'Blood Connect', subtitle: app.name, letter: 'B' }}
      user={{ name: ROLE_LABELS[role] }}
      primaryNav={primaryNav}
      secondaryNav={secondaryNav}
      currentPath={currentPath}
      currentTitle={currentTitle}
      signOutSlot={signOutSlot}
      headerSlot={
        <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
          {ROLE_LABELS[role]}
        </span>
      }
    >
      {children}
      <footer className="mt-8 border-t border-border pt-4 text-xs text-ink-subtle">
        Not a medical device. This system does not make clinical
        decisions; the pre-donation assessment and the pre-transfusion
        compatibility test always happen on site. Running on synthetic
        data, no real patient or donor record.
      </footer>
    </AppShell>
  );
}
