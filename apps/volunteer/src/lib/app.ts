/**
 * This application: the volunteer app (§1, ADR 0016).
 *
 * The one line that differs between the three staff applications' frames.
 * Everything that reads a session, sets a cookie or decides access is handed
 * this, so a volunteer admin's session is the only kind this application
 * resolves.
 */
export { VOLUNTEER_APP as APP } from '@obdm/staff-web';
