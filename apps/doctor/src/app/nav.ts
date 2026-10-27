import type { NavItem } from '@obdm/ui';

/**
 * The nav rail's contents.
 *
 * Kept out of the shell component so a lint pass sees exactly one place where
 * this application's surfaces are enumerated, and so a route added to
 * `src/app` never becomes findable through the sidebar without a matching
 * entry here. Only this role's surfaces appear: the other roles have their own
 * applications (ADR 0016).
 *
 * The doctor's rail is deliberately thin (ADR 0010): a doctor's app is a
 * request slip, not a workstation, so nothing that is not the slip and the
 * day's list is on the primary rail.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/dashboard', match: '/dashboard', label: 'Dashboard' },
  { href: '/requests/new', match: '/requests/new', label: 'New request' },
  { href: '/patients/new', match: '/patients/new', label: 'Record patient' },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { href: '/profile', match: '/profile', label: 'Profile' },
];
