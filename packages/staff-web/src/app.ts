import type { StaffAudience } from '@obdm/platform';

/**
 * Which staff application this is (§1, ADR 0016).
 *
 * The doctor, centre and volunteer applications are three deployments with one
 * frame. Everything in this package that differs between them is on this
 * record, and each application passes its own in. Nothing here reads a
 * pathname or a host to work out where it is running.
 */
export type StaffApp = {
  /** The audience its sessions are bound to. Sessions from the others resolve to nobody. */
  readonly audience: StaffAudience;
  /**
   * The session cookie. Named per application, because in development all
   * four share `localhost`, where cookies are not isolated by port, and one
   * application signing out must not delete another's cookie.
   */
  readonly cookie: string;
  /** Shown in the header, so a shared workstation says which system it is. */
  readonly name: string;
  /** Who signs in here, as a sentence would say it. */
  readonly who: string;
};

export const DOCTOR_APP: StaffApp = {
  audience: 'doctor',
  cookie: 'bc_doctor_session',
  name: 'Doctors',
  who: 'doctors',
};

export const CENTRE_APP: StaffApp = {
  audience: 'centre',
  cookie: 'bc_centre_session',
  name: 'Blood centre',
  who: 'blood centre staff',
};

export const VOLUNTEER_APP: StaffApp = {
  audience: 'volunteer',
  cookie: 'bc_volunteer_session',
  name: 'Volunteers',
  who: 'volunteer admins',
};

export const STAFF_APPS: readonly StaffApp[] = [DOCTOR_APP, CENTRE_APP, VOLUNTEER_APP];
