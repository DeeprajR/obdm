/**
 * Applies `db/migrations` as the migrator role (§5.9).
 *
 * Forward-only, and the only creator of the `hospital` and `reference` schemas,
 * including the two shared contract tables, which the bot's migrations must
 * never mention (§2.1).
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { databaseUrl, redact } from './env.js';
import { findUp } from './paths.js';

const migrationsFolder = findUp(
  'migrations',
  path.dirname(fileURLToPath(import.meta.url)),
);

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
  const url = databaseUrl('migrator');
  process.stdout.write(`applying migrations to ${redact(url)}\n`);

  // `max: 1` because migrations must run in one session, in order.
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    process.stdout.write('migrations applied\n');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `migration failed: ${describe(error)}\n` +
      'A refused connection means Postgres is not up: `docker compose ps`, then `pnpm services:up`.\n',
  );
  process.exit(1);
});
