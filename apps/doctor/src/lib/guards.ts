import 'server-only';

import {
  requireAccess as requireAccessIn,
  requirePermission as requirePermissionIn,
  useCaseContext,
} from '@blood-connect/staff-web';
import type { Actor, Permission } from '@blood-connect/platform';

import { APP } from './app';

/**
 * Layer 2 of §13, the page guard, for this application.
 *
 * Every protected page calls `requireAccess` before rendering. The rule is the
 * shared `decideAccess` table, read with this application's audience, so the
 * proxy and the page cannot disagree about it.
 */
export const requireAccess = (pathname: string): Promise<Actor> =>
  requireAccessIn(APP, pathname);

export const requirePermission = (permission: Permission): Promise<Actor> =>
  requirePermissionIn(APP, permission);

export { useCaseContext };
