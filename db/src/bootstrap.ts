/**
 * Bringing up a real deployment (§2.2, §5.9).
 *
 * The seed refuses to run against production, and rightly: it creates four
 * accounts with a published password. But the seed was also the only thing
 * that wrote the location hierarchy, the centre's district and the contract
 * version, and without the last of those neither release will start. This is
 * the production-safe half of it: the shared provisioning, plus **one
 * administrator**, whose password the operator chooses and this script never
 * prints. Every other account is invited by that administrator (§2.2).
 *
 * Three refusals, each because the alternative is a back door:
 *
 *  - It never resets a password. An administrator who exists is left exactly
 *    as they are, so a re-run cannot be used to take over an account.
 *  - It refuses a database holding the seeded demonstration accounts, because
 *    a deployment with `doctor@obdm.invalid` on it has a published
 *    password on it, and bootstrapping around that would hide it.
 *  - It refuses the seed's password, and anything shorter than twelve
 *    characters, for the one account that can create every other.
 *
 * Idempotent: a second run reports what already exists and changes nothing.
 *
 *   BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_NAME=... BOOTSTRAP_ADMIN_PASSWORD=... pnpm db:bootstrap
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { and, count, eq, like, ne } from 'drizzle-orm';
import postgres from 'postgres';
import { hash } from '@node-rs/argon2';

import { newId } from '@obdm/ids';

import { databaseUrl, redact } from './env.js';
import { SEED_PASSWORD } from '../seeds/accounts.js';
import {
  provisionCentreSettings,
  provisionContractVersion,
  provisionLocations,
  type Database,
} from './provision.js';
import { auditLog, users } from './schema/index.js';

/** The one account this script may create needs a password worth having. */
const MIN_ADMIN_PASSWORD_LENGTH = 12;

/** RFC 2606 reserves `.invalid`; only the seed puts an account on it. */
const SEEDED_DOMAIN = '%@obdm.invalid';

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value === '' ? undefined : value;
};

async function refuseIfSeeded(db: Database): Promise<void> {
  const [row] = await db.select({ n: count() }).from(users).where(like(users.email, SEEDED_DOMAIN));
  if ((row?.n ?? 0) > 0) {
    process.stderr.write(
      `bootstrap refused: ${row?.n ?? 0} seeded demonstration account(s) exist on this database. ` +
        'They carry a published password. This is a development database, or one that must be ' +
        'rebuilt before anything real runs against it.\n',
    );
    process.exit(1);
  }
}

async function provisionAdministrator(db: Database): Promise<void> {
  // Any administrator who could sign in. A deactivated one is nobody's way
  // in, and a deployment whose only administrator was deactivated needs this
  // script to work rather than to report an account nobody can use.
  const [existing] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, 'admin'), ne(users.status, 'deactivated')));

  if ((existing?.n ?? 0) > 0) {
    process.stdout.write(
      `  admin:     ${existing?.n ?? 0} administrator account(s) exist; nothing changed\n`,
    );
    return;
  }

  const email = env('BOOTSTRAP_ADMIN_EMAIL')?.toLowerCase();
  const fullName = env('BOOTSTRAP_ADMIN_NAME');
  const password = process.env['BOOTSTRAP_ADMIN_PASSWORD'] ?? '';

  if (!email || !fullName || password === '') {
    process.stderr.write(
      'bootstrap: no administrator exists yet. Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME ' +
        'and BOOTSTRAP_ADMIN_PASSWORD to create the first one.\n',
    );
    process.exit(1);
  }
  if (!email.includes('@') || email.endsWith('@obdm.invalid')) {
    process.stderr.write('bootstrap: BOOTSTRAP_ADMIN_EMAIL must be a real address.\n');
    process.exit(1);
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH || password === SEED_PASSWORD) {
    process.stderr.write(
      `bootstrap: BOOTSTRAP_ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters ` +
        'and not the seed password.\n',
    );
    process.exit(1);
  }

  const id = newId();
  const correlationId = newId();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      email,
      fullName,
      role: 'admin',
      provisionalReg: null,
      districtScopeId: null,
      status: 'active',
      passwordHash: await hash(password),
    });

    // The one account that was not invited by another, recorded as such (§14).
    await tx.insert(auditLog).values({
      id: newId(),
      actorUserId: null,
      actorKind: 'system',
      action: 'account.bootstrapped',
      subjectType: 'user',
      subjectId: id,
      correlationId,
      metadata: { role: 'admin', by: 'db:bootstrap' },
    });
  });

  process.stdout.write(`  admin:     created ${email}. Sign in at the administration application.\n`);
}

/** `String(error)` drops the cause, and the cause is where ECONNREFUSED is. */
const describe = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  // A refused connection on localhost is an AggregateError with no message of
  // its own and one ECONNREFUSED per address family inside it; walk the chain
  // and read whatever each link actually says.
  let cause: unknown = error.cause;
  while (cause instanceof Error) {
    const inner = cause as Error & { errors?: unknown[]; code?: string };
    const nested = Array.isArray(inner.errors)
      ? inner.errors.map((e) => (e instanceof Error ? e.message : String(e))).join('; ')
      : '';
    const text = [inner.message, nested, inner.code ?? ''].find((part) => part !== '') ?? '';
    if (text !== '') parts.push(text);
    cause = inner.cause;
  }
  return parts.join(': ');
};

async function main(): Promise<void> {
  // Provisioning writes reference data the application role cannot create, so
  // it runs as the migrator like the migrations it follows.
  const url = databaseUrl('migrator');
  process.stdout.write(`bootstrapping ${redact(url)}\n`);

  const client = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    const db = drizzle(client);
    await refuseIfSeeded(db);
    await provisionLocations(db);
    await provisionCentreSettings(db, {
      districtId: env('CENTRE_DISTRICT_ID') ?? 'KL_KKD',
      cityId: env('CENTRE_CITY_ID') ?? 'KKD_T1',
    });
    await provisionContractVersion(db);
    await provisionAdministrator(db);
    process.stdout.write('bootstrap complete\n');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `bootstrap failed: ${describe(error)}\n` +
      'A refused connection means Postgres is not up: `docker compose ps`, then `pnpm services:up`.\n',
  );
  process.exit(1);
});
