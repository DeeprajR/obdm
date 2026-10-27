/**
 * Where the five applications are (ADR 0016, ADR 0017).
 *
 * The origins come from the same variables the applications read, with the
 * development ports as defaults, so a fresh checkout with `pnpm dev` running
 * needs no configuration. The staff accounts are the seeded demo accounts,
 * synthetic on a `.invalid` domain, with the password the seed prints.
 */

const origin = (name: string, fallback: string): string =>
  (process.env[name] ?? fallback).replace(/\/+$/, '');

export type StaffRole = 'doctor' | 'admin' | 'centre' | 'volunteer';

export type StaffApp = {
  readonly role: StaffRole;
  readonly origin: string;
  readonly email: string;
  /** Where a successful sign-in lands. */
  readonly landing: string;
  /** What the sign-in card says it is for, which is how a wrong address is recognised. */
  readonly name: string;
};

export const PASSWORD = process.env['E2E_PASSWORD'] ?? 'OBDM!Demo2026';

export const APPS: Readonly<Record<StaffRole, StaffApp>> = {
  doctor: {
    role: 'doctor',
    origin: origin('DOCTOR_APP_URL', 'http://localhost:3000'),
    email: 'doctor@obdm.invalid',
    landing: '/dashboard',
    name: 'Doctors',
  },
  admin: {
    role: 'admin',
    origin: origin('ADMIN_APP_URL', 'http://localhost:3001'),
    email: 'admin@obdm.invalid',
    landing: '/doctors',
    name: 'administration',
  },
  centre: {
    role: 'centre',
    origin: origin('CENTRE_APP_URL', 'http://localhost:3002'),
    email: 'centre@obdm.invalid',
    landing: '/centre',
    name: 'Blood centre',
  },
  volunteer: {
    role: 'volunteer',
    origin: origin('VOLUNTEER_APP_URL', 'http://localhost:3003'),
    email: 'volunteer@obdm.invalid',
    landing: '/volunteer',
    name: 'Volunteers',
  },
};

export const STAFF_ROLES: readonly StaffRole[] = ['doctor', 'admin', 'centre', 'volunteer'];

/** The donor app: no account, a device cookie per browser context. */
export const DONOR = {
  origin: origin('DONOR_APP_URL', 'http://localhost:3004'),
} as const;
