import type { NavItem } from '@obdm/ui';

/**
 * The sidebar's contents.
 *
 * A single role signs in here (administrator, ADR 0003), so unlike
 * the staff applications' per-role `nav.ts` this has nothing to branch on. Kept as
 * its own file anyway, so the surface a route can reach through the
 * sidebar has one place it is declared, same reasoning as the staff applications.
 */

export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/doctors', match: '/doctors', label: 'Doctors' },
  { href: '/updates', match: '/updates', label: 'Update requests' },
  { href: '/panel', match: '/panel', label: 'Control panel' },
];

export const SECONDARY_NAV: readonly NavItem[] = [];
