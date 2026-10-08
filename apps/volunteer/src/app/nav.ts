import type { NavItem } from '@blood-connect/ui';

/**
 * The nav rail's contents.
 *
 * Kept out of the shell component so a lint pass sees exactly one place where
 * this application's surfaces are enumerated, and so a route added to
 * `src/app` never becomes findable through the sidebar without a matching
 * entry here. Only this role's surfaces appear: the other roles have their own
 * applications (ADR 0016). The public board is here because it is Module 4's
 * public face, and this dashboard is where its link is shared from.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/volunteer', match: '/volunteer', label: 'Board' },
  { href: '/board', match: '/board', label: 'Public board' },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { href: '/profile', match: '/profile', label: 'Profile' },
];
