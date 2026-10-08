import 'server-only';

import {
  assertSameOrigin,
  currentActor as currentActorIn,
  requestMetadata,
} from '@blood-connect/staff-web';
import type { Actor } from '@blood-connect/platform';

import { APP } from './app';

/**
 * The session, bound to this application (§3, §13).
 *
 * The mechanism is shared by the three staff applications and lives in
 * `@blood-connect/staff-web`; this file fixes which application is asking, so
 * no page can resolve a session from the wrong one.
 */
export const currentActor = (): Promise<Actor> => currentActorIn(APP);

export { assertSameOrigin, requestMetadata };
