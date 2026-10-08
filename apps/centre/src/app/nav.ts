import type { NavItem } from '@blood-connect/ui';

/**
 * The nav rail's contents.
 *
 * Kept out of the shell component so a lint pass sees exactly one place where
 * this application's surfaces are enumerated, and so a route added to
 * `src/app` never becomes findable through the sidebar without a matching
 * entry here. Only this role's surfaces appear: the other roles have their own
 * applications (ADR 0016).
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/centre', match: '/centre', label: 'Centre' },
  { href: '/centre/requests', match: '/centre/requests', label: 'Requests' },
  { href: '/centre/stock', match: '/centre/stock', label: 'Stock' },
  { href: '/centre/donations', match: '/centre/donations', label: 'Donations' },
  { href: '/centre/demands', match: '/centre/demands', label: 'Demands' },
  { href: '/centre/quarantine', match: '/centre/quarantine', label: 'Quarantine' },
  { href: '/centre/tags', match: '/centre/tags', label: 'Tags' },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { href: '/centre/settings', match: '/centre/settings', label: 'Centre settings' },
  { href: '/profile', match: '/profile', label: 'Profile' },
];
