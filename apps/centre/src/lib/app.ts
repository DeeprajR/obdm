/**
 * This application: the blood centre app (§1, ADR 0016).
 *
 * The one line that differs between the three staff applications' frames.
 * Everything that reads a session, sets a cookie or decides access is handed
 * this, so a blood centre session is the only kind this application resolves.
 */
export { CENTRE_APP as APP } from '@blood-connect/staff-web';
