/**
 * The frame the three staff applications share (§1, ADR 0016).
 *
 * The doctor, blood centre and volunteer applications are separate
 * deployments, each with its own sign-in, cookie and session audience. What
 * they have in common is everything around their own screens: the proxy, the
 * page guard, the session, the shell, and the account pages that every role
 * has. That lives here, once, parameterised by a `StaffApp`, and is drawn with
 * the kit in `@blood-connect/ui` (ADR 0015).
 *
 * What does **not** live here is anything that belongs to one role. A doctor's
 * request form, the centre's shelf and the volunteer board stay in their own
 * application, so this package can never become the place a role's rule is
 * quietly shared with another.
 *
 * Server-side only. The browser half is `@blood-connect/staff-web/client`.
 */

export {
  CENTRE_APP,
  DOCTOR_APP,
  STAFF_APPS,
  VOLUNTEER_APP,
  type StaffApp,
} from './app.js';

export {
  assertSameOrigin,
  clearSessionCookie,
  currentActor,
  readSessionToken,
  requestMetadata,
  sessionCookieOptions,
  setSessionCookie,
} from './session.js';
export { requireAccess, requirePermission, useCaseContext } from './guards.js';
export { guardRequest } from './proxy.js';
export { accountActions } from './account-actions.js';
export { healthResponse } from './health.js';

export { StaffDocument, staffMetadata, staffViewport } from './document.js';
export { AppFrame, type AppFrameProps } from './frame.js';
export { PublicPage } from './public-page.js';
export { Landing } from './landing.js';
export { SignInCard } from './sign-in.js';
export { ResetCards } from './reset.js';
export { InviteCard } from './invite.js';
export { ConfirmEmailOutcome } from './confirm-email.js';
export { ProfileBody, type ProfileActions } from './profile.js';
export { OfflineScreen } from './offline.js';
export { ForbiddenScreen } from './forbidden.js';

export type { FormAction, FormState, SignInAction, SignInFormState } from './form-state.js';
