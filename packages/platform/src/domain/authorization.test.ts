import { describe, expect, it } from 'vitest';

import {
  AUDIENCES,
  PERMISSIONS,
  ROLES_BY_AUDIENCE,
  RULES_BY_AUDIENCE,
  accessFor,
  actorHas,
  anonymousActor,
  decideAccess,
  isSameOrigin,
  landingFor,
  permissionsFor,
  roleHas,
  systemActor,
  audienceFor,
  type Actor,
  type Audience,
  type UserRole,
} from './authorization.js';

const ROLES: readonly UserRole[] = ['doctor', 'admin', 'blood_centre', 'volunteer_admin'];

const STAFF_AUDIENCES = ['doctor', 'centre', 'volunteer'] as const;

const as = (role: UserRole): Actor => ({
  kind: 'user',
  userId: '0199f000-0000-7000-8000-000000000001',
  role,
  districtScopeId: null,
});

const deviceActor: Actor = { kind: 'device', deviceId: 'device-1' };

/**
 * §9's role and surface matrix, transcribed.
 *
 * `yes` and `no` are the spec's own words. This table is the assertion; the
 * implementation is what is being checked against it, not the other way round.
 *
 * Every surface names the application it is served from (ADR 0016). A role
 * reaching a surface means reaching it there: a doctor's `yes` on `/dashboard`
 * is a `yes` in the doctor app, and the same session is nobody in the others.
 *
 * Columns: anonymous · doctor · admin · blood_centre · volunteer_admin
 */
const MATRIX: readonly {
  surface: string;
  app: Audience;
  path: string;
  anonymous: boolean;
  doctor: boolean;
  admin: boolean;
  blood_centre: boolean;
  volunteer_admin: boolean;
}[] = [
  {
    surface: 'Landing, sign-in, offline',
    app: 'doctor',
    path: '/sign-in',
    anonymous: true,
    doctor: true,
    admin: true,
    blood_centre: true,
    volunteer_admin: true,
  },
  {
    surface: 'Public demand board',
    app: 'volunteer',
    path: '/board',
    anonymous: true,
    doctor: true,
    admin: true,
    blood_centre: true,
    volunteer_admin: true,
  },
  {
    surface: 'Password reset (OTP)',
    app: 'centre',
    path: '/reset',
    anonymous: true,
    doctor: true,
    admin: true,
    blood_centre: true,
    volunteer_admin: true,
  },
  {
    surface: 'Dashboard, patients, admissions, requests, samples',
    app: 'doctor',
    path: '/dashboard',
    anonymous: false,
    doctor: true,
    admin: false,
    blood_centre: false,
    volunteer_admin: false,
  },
  {
    surface: 'Patients',
    app: 'doctor',
    path: '/patients',
    anonymous: false,
    doctor: true,
    admin: false,
    blood_centre: false,
    volunteer_admin: false,
  },
  {
    surface: 'Requests',
    app: 'doctor',
    path: '/requests',
    anonymous: false,
    doctor: true,
    admin: false,
    blood_centre: false,
    volunteer_admin: false,
  },
  {
    surface: 'Own profile, in the doctor app',
    app: 'doctor',
    path: '/profile',
    anonymous: false,
    doctor: true,
    admin: false,
    blood_centre: false,
    volunteer_admin: false,
  },
  {
    surface: 'Own profile, in the centre app',
    app: 'centre',
    path: '/profile',
    anonymous: false,
    doctor: false,
    admin: false,
    blood_centre: true,
    volunteer_admin: false,
  },
  {
    surface: 'Own profile, in the volunteer app',
    app: 'volunteer',
    path: '/profile',
    anonymous: false,
    doctor: false,
    admin: false,
    blood_centre: false,
    volunteer_admin: true,
  },
  {
    surface: 'Centre inventory / requests / demand / settings',
    app: 'centre',
    path: '/centre',
    anonymous: false,
    doctor: false,
    admin: false,
    blood_centre: true,
    volunteer_admin: false,
  },
  {
    surface: 'Volunteer dashboard',
    app: 'volunteer',
    path: '/volunteer',
    anonymous: false,
    doctor: false,
    admin: false,
    blood_centre: false,
    volunteer_admin: true,
  },
  {
    surface: 'Camera calibration screen',
    app: 'centre',
    path: '/centre/calibration',
    anonymous: false,
    doctor: false,
    admin: false,
    blood_centre: true,
    volunteer_admin: false,
  },
  {
    surface: 'Camera observation / tag reader endpoint',
    app: 'centre',
    path: '/api/device/observations',
    anonymous: false,
    doctor: false,
    admin: false,
    blood_centre: false,
    volunteer_admin: false,
  },
];

describe('the role and surface matrix (§9)', () => {
  for (const row of MATRIX) {
    describe(`${row.surface}: ${row.app} ${row.path}`, () => {
      it(`anonymous: ${row.anonymous ? 'yes' : 'no'}`, () => {
        expect(decideAccess(row.path, anonymousActor, row.app).allowed).toBe(row.anonymous);
      });

      for (const role of ROLES) {
        it(`${role}: ${row[role] ? 'yes' : 'no'}`, () => {
          expect(decideAccess(row.path, as(role), row.app).allowed).toBe(row[role]);
        });
      }
    });
  }

  it('lets no browser session reach a device endpoint, however privileged (§9.2)', () => {
    // The four kinds of caller never share a middleware. An admin cookie is not
    // a device token and must not behave like one.
    for (const role of ROLES) {
      expect(decideAccess('/api/device/observations', as(role), 'centre')).toEqual({
        allowed: false,
        reason: 'forbidden',
      });
    }
    expect(decideAccess('/api/device/observations', deviceActor, 'centre').allowed).toBe(true);
  });

  it('lets no device token reach a staff surface', () => {
    for (const [app, path] of [
      ['doctor', '/dashboard'],
      ['doctor', '/profile'],
      ['centre', '/centre'],
      ['volunteer', '/volunteer'],
      ['admin', '/doctors'],
    ] as const) {
      expect(decideAccess(path, deviceActor, app).allowed, `${app} ${path}`).toBe(false);
    }
  });
});

describe('the refusal distinguishes two cases (§13)', () => {
  it('sends an anonymous visitor to sign in', () => {
    expect(decideAccess('/dashboard', anonymousActor, 'doctor')).toEqual({
      allowed: false,
      reason: 'unauthenticated',
    });
  });

  it('refuses a signed-in user on the wrong surface outright', () => {
    // Not `unauthenticated`: sending them to a sign-in form would suggest a
    // different account might work, which is untrue and an invitation.
    expect(decideAccess('/admin', as('doctor'), 'doctor')).toEqual({
      allowed: false,
      reason: 'forbidden',
    });
  });
});

describe('routes fail closed', () => {
  it('denies a path with no rule, in every application', () => {
    // The direction that gets noticed in development rather than in production.
    for (const app of AUDIENCES) {
      for (const path of ['/secret', '/api/internal/metrics', '/centre-admin']) {
        expect(accessFor(path, app), `${app} ${path}`).toEqual({ kind: 'roles', roles: [] });
        expect(decideAccess(path, as('admin'), app).allowed, `${app} ${path}`).toBe(false);
      }
    }
  });

  it('matches on path segments, never on a string prefix', () => {
    // `/centres` is not inside `/centre`, and must not inherit its rule.
    expect(decideAccess('/centres', as('blood_centre'), 'centre').allowed).toBe(false);
    expect(decideAccess('/centre/stock', as('blood_centre'), 'centre').allowed).toBe(true);
  });

  it('takes the longest matching prefix, not the first written', () => {
    expect(accessFor('/centre/calibration', 'centre')).toEqual({
      kind: 'roles',
      roles: ['blood_centre'],
    });
  });

  it('treats a trailing slash and a query as the same route', () => {
    expect(decideAccess('/centre/', as('doctor'), 'centre').allowed).toBe(false);
    expect(decideAccess('/centre/?tab=stock', as('blood_centre'), 'centre').allowed).toBe(true);
  });

  it('does not let the root rule swallow every path', () => {
    expect(accessFor('/', 'doctor')).toEqual({ kind: 'public' });
    expect(accessFor('/dashboard', 'doctor')).not.toEqual({ kind: 'public' });
  });
});

describe('permissions', () => {
  it('never lets the blood centre raise a request', () => {
    // A doctor must not decide on their own request, which is why blood_centre
    // is a separate role rather than a permission on the doctor account (§2.2).
    expect(roleHas('blood_centre', 'requests:manage')).toBe(false);
    expect(roleHas('blood_centre', 'patients:manage')).toBe(false);
  });

  it('never lets a doctor operate the centre', () => {
    expect(roleHas('doctor', 'centre:operate')).toBe(false);
    expect(roleHas('doctor', 'doctors:manage')).toBe(false);
  });

  it('never lets a volunteer admin reach clinical work', () => {
    expect(permissionsFor('volunteer_admin')).toEqual(['profile:manage', 'volunteer:view']);
  });

  it('gives every role its own profile', () => {
    for (const role of ROLES) {
      expect(roleHas(role, 'profile:manage'), role).toBe(true);
    }
  });

  it('grants nothing to an anonymous, system or device actor', () => {
    for (const permission of PERMISSIONS) {
      expect(actorHas(anonymousActor, permission), permission).toBe(false);
      expect(actorHas(systemActor('a job'), permission), permission).toBe(false);
      expect(actorHas(deviceActor, permission), permission).toBe(false);
    }
  });

  it('leaves no permission unreachable by every role', () => {
    // A permission nothing grants is either dead or a role is missing it.
    for (const permission of PERMISSIONS) {
      const holders = ROLES.filter((role) => roleHas(role, permission));
      expect(holders.length, permission).toBeGreaterThan(0);
    }
  });
});

describe('where a role lands after signing in (§3)', () => {
  it('is that role’s own dashboard, never a menu', () => {
    expect(landingFor('doctor')).toBe('/dashboard');
    expect(landingFor('admin')).toBe('/doctors');
    expect(landingFor('blood_centre')).toBe('/centre');
    expect(landingFor('volunteer_admin')).toBe('/volunteer');
  });
});

describe('the route table itself', () => {
  for (const [name, rules] of Object.entries(RULES_BY_AUDIENCE)) {
    it(`${name}: has no duplicate prefix`, () => {
      const prefixes = rules.map((rule) => rule.prefix);
      expect(new Set(prefixes).size).toBe(prefixes.length);
    });

    it(`${name}: starts every prefix with a slash`, () => {
      for (const rule of rules) {
        expect(rule.prefix.startsWith('/'), rule.prefix).toBe(true);
      }
    });
  }
});

describe('the same-origin check (§3)', () => {
  it('accepts a request from the same host', () => {
    expect(isSameOrigin('http://localhost:3000', 'localhost:3000')).toBe(true);
    expect(isSameOrigin('https://blood.example.in', 'blood.example.in')).toBe(true);
  });

  it('refuses another origin, including one that merely starts the same', () => {
    expect(isSameOrigin('http://evil.example', 'localhost:3000')).toBe(false);
    // A different port is a different origin, which is what keeps a form on
    // one of the four applications from posting to another in development.
    expect(isSameOrigin('http://localhost:3001', 'localhost:3000')).toBe(false);
    expect(isSameOrigin('http://localhost:3002', 'localhost:3000')).toBe(false);
    // And a suffix match is not a match.
    expect(isSameOrigin('https://blood.example.in.evil.test', 'blood.example.in')).toBe(false);
  });

  it('refuses a missing Origin rather than trusting the absence', () => {
    // Every browser that can run this app sends it on a POST. Treating absence
    // as trustworthy is how these checks get quietly bypassed.
    expect(isSameOrigin(null, 'localhost:3000')).toBe(false);
    expect(isSameOrigin(undefined, 'localhost:3000')).toBe(false);
    expect(isSameOrigin('', 'localhost:3000')).toBe(false);
  });

  it('refuses a missing or unparseable value on either side', () => {
    expect(isSameOrigin('http://localhost:3000', null)).toBe(false);
    expect(isSameOrigin('not a url', 'localhost:3000')).toBe(false);
    expect(isSameOrigin('null', 'localhost:3000')).toBe(false);
  });
});

/**
 * Every role has its own application (§1, ADR 0003, ADR 0016).
 *
 * The four share one `users` table, so the thing worth asserting is that a
 * role reaches exactly one of them, and that a role's screens are served by
 * that one application and no other.
 */
describe('one application per role', () => {
  it('puts every role in exactly one application', () => {
    for (const role of ROLES) {
      const homes = AUDIENCES.filter((app) => ROLES_BY_AUDIENCE[app].includes(role));
      expect(homes, role).toEqual([audienceFor(role)]);
    }
    expect(audienceFor('doctor')).toBe('doctor');
    expect(audienceFor('blood_centre')).toBe('centre');
    expect(audienceFor('volunteer_admin')).toBe('volunteer');
    expect(audienceFor('admin')).toBe('admin');
  });

  it('lands each role somewhere its own application allows', () => {
    for (const role of ROLES) {
      const audience = audienceFor(role);
      expect(decideAccess(landingFor(role), as(role), audience).allowed, role).toBe(true);
    }
  });

  it('refuses every other role at an application’s front door', () => {
    // The landing of each application, presented with each role that does not
    // belong there. Refused before the route rule is consulted.
    for (const app of AUDIENCES) {
      const [owner] = ROLES_BY_AUDIENCE[app];
      const home = landingFor(owner!);

      for (const role of ROLES.filter((other) => audienceFor(other) !== app)) {
        expect(decideAccess(home, as(role), app), `${role} at ${app} ${home}`).toEqual({
          allowed: false,
          reason: 'forbidden',
        });
      }
    }
  });

  it('serves a role’s screens from its own application and no other', () => {
    // Not merely refused elsewhere: absent. A path with no rule is denied to
    // everyone, so the doctor app has no `/centre` a misconfigured role could
    // be let into.
    for (const [path, home] of [
      ['/dashboard', 'doctor'],
      ['/requests/abc', 'doctor'],
      ['/centre', 'centre'],
      ['/centre/stock', 'centre'],
      ['/api/device/scan', 'centre'],
      ['/volunteer', 'volunteer'],
      ['/board', 'volunteer'],
      ['/doctors', 'admin'],
      ['/panel', 'admin'],
    ] as const) {
      for (const app of AUDIENCES.filter((other) => other !== home)) {
        expect(accessFor(path, app), `${path} in ${app}`).toEqual({ kind: 'roles', roles: [] });
      }
    }
  });

  it('gives every staff application the account pages', () => {
    // An invite, a reset and an address change are each opened in the
    // application the account belongs to, so all three need all of them.
    for (const app of STAFF_AUDIENCES) {
      for (const path of [
        '/',
        '/sign-in',
        '/reset',
        '/invite/abc',
        '/confirm-email/abc',
        '/offline',
        '/api/health',
      ]) {
        expect(decideAccess(path, anonymousActor, app).allowed, `${app} ${path}`).toBe(true);
      }
      expect(accessFor('/profile', app), app).toEqual({ kind: 'authenticated' });
    }
  });
});

describe('the administration application', () => {
  it('admits the administrator and nobody else', () => {
    expect(decideAccess('/doctors', as('admin'), 'admin').allowed).toBe(true);

    for (const role of ['doctor', 'blood_centre', 'volunteer_admin'] as const) {
      expect(decideAccess('/doctors', as(role), 'admin'), role).toEqual({
        allowed: false,
        reason: 'forbidden',
      });
    }
  });

  it('gives the administrator nothing in the staff applications', () => {
    for (const [app, path] of [
      ['doctor', '/dashboard'],
      ['doctor', '/patients'],
      ['doctor', '/profile'],
      ['centre', '/centre'],
      ['centre', '/profile'],
      ['volunteer', '/volunteer'],
      ['volunteer', '/profile'],
    ] as const) {
      expect(decideAccess(path, as('admin'), app), `${app} ${path}`).toEqual({
        allowed: false,
        reason: 'forbidden',
      });
    }
  });

  it('still lets an administrator reach the pages that carry no data', () => {
    // The sign-in form and the emailed links are public on every application:
    // an invite or a reset must open for someone with no session at all.
    for (const path of ['/sign-in', '/reset', '/invite/abc', '/confirm-email/abc']) {
      expect(decideAccess(path, anonymousActor, 'admin').allowed, path).toBe(true);
    }
  });

  it('has no public surface beyond signing in', () => {
    // Notably no demand board and no landing page: everything else is an
    // administrator-only screen.
    expect(decideAccess('/', anonymousActor, 'admin').allowed).toBe(false);
    expect(decideAccess('/doctors', anonymousActor, 'admin')).toEqual({
      allowed: false,
      reason: 'unauthenticated',
    });
  });
});
