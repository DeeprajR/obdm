/**
 * The worker (§1, §11.1).
 *
 * The web release is stateless and may run as several replicas, and a replica
 * must not own a schedule: with three of them every sweep would fire three
 * times. So the jobs run here, in one process, on the same packages and the
 * same database role as the four web applications. It is a process count, not
 * a component: nothing in it is a rule, and every job is a use case the
 * applications could call themselves.
 *
 * **Exactly one runs.** A Postgres advisory lock is taken on a dedicated
 * connection at boot, and a second instance, which a rolling deploy produces
 * for a moment, stands by until the first lets go. The lock is session-scoped,
 * so if the connection holding it dies the lock dies with it and the standby
 * takes over; this process notices the same loss and exits so a supervisor
 * restarts it as the new standby.
 *
 * Every job is idempotent: the email drain claims rows with `SKIP LOCKED`, and
 * each sweep is a conditional UPDATE or DELETE. A job that runs twice does
 * nothing the second time, which is what makes the lock a latency choice
 * rather than a correctness one.
 */

// First, before any package opens a connection: see env.ts.
import './env.js';

import postgres from 'postgres';

import { discardExpiredQuarantine, expireStaleBags } from '@obdm/centre';
import { WEB_RUNTIME_RULES, refuseToStartUnconfigured } from '@obdm/config';
import { CONTRACT_VERSION, checkContractVersion } from '@obdm/contract';
import { appConfig } from '@obdm/db';
import { APP_TIMEZONE, dayOf } from '@obdm/domain';
import { idGenerator } from '@obdm/ids';
import {
  argon2Hasher,
  currentConfig,
  db,
  drainEmailOutbox,
  nodeTokens,
  smtpEmailPort,
  sweepExpiredCredentials,
  systemActor,
  type UseCaseContext,
} from '@obdm/platform';

import { dueJobs, msUntilNextDue } from './schedule.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/** How often the loop looks for due work when nothing is due sooner. */
const IDLE_MS = 5 * SECOND;

/** How often a standby asks for the lock. */
const STANDBY_MS = 15 * SECOND;

/**
 * The lock's key. Any constant will do; what matters is that every worker
 * asks for the same one and nothing else in the database asks for it.
 */
const LOCK_KEY = 0x626c6f6f; // 'bloo'

const out = (line: string): void => {
  const at = new Date().toISOString().slice(11, 23);
  process.stdout.write(`${at} ${line}\n`);
};

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

type Job = {
  readonly name: string;
  readonly everyMs: number;
  /** Returns a line for the terminal, or nothing when there was nothing to say. */
  readonly run: (ctx: UseCaseContext) => Promise<string | undefined>;
};

/**
 * The schedule (§11.1). Every cadence is a latency choice: nothing here is
 * lost by running late, because every job reads its work from a column.
 */
const JOBS: readonly Job[] = [
  {
    name: 'drain-email-outbox',
    everyMs: 15 * SECOND,
    run: async (ctx) => {
      const result = await drainEmailOutbox(ctx.db, smtpEmailPort, ctx.clock.now());
      const touched = result.sent + result.retrying + result.failed;
      return touched === 0
        ? undefined
        : `${result.sent} sent, ${result.retrying} retrying, ${result.failed} failed`;
    },
  },
  {
    name: 'expire-bags',
    everyMs: HOUR,
    run: async (ctx) => {
      const result = await expireStaleBags(ctx);
      return result.expired === 0 ? undefined : `${result.expired} bags past their expiry marked expired`;
    },
  },
  {
    name: 'discard-expired-quarantine',
    everyMs: HOUR,
    run: async (ctx) => {
      const result = await discardExpiredQuarantine(ctx);
      return result.discarded === 0
        ? undefined
        : `${result.discarded} quarantined bags past their expiry discarded`;
    },
  },
  {
    name: 'sweep-credentials',
    everyMs: HOUR,
    run: async (ctx) => {
      const result = await sweepExpiredCredentials(ctx);
      const total = result.sessions + result.otps + result.emailChanges + result.rateLimitWindows;
      return total === 0
        ? undefined
        : `${result.sessions} sessions, ${result.otps} reset codes, ${result.emailChanges} address changes, ${result.rateLimitWindows} throttle windows removed`;
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

async function refuseUnlessContractMatches(): Promise<void> {
  const rows = await db.select({ key: appConfig.key, value: appConfig.value }).from(appConfig);
  const stored = rows.find((row) => row.key === 'contract.version')?.value;
  const found = typeof stored === 'string' ? stored : '';
  const version = checkContractVersion(found);
  if (!version.ok) {
    // A mismatched deploy is a refused start, not a sweep run against a
    // schema this build does not understand (§6).
    throw new Error(
      `contract version mismatch: this worker speaks ${CONTRACT_VERSION}, the database says ` +
        `${found || '(nothing: has the database been bootstrapped?)'}. ${version.reason}`,
    );
  }
}

/**
 * A wait that a signal can cut short. The abort listener is removed when the
 * timer fires normally: one signal lives for the whole process, and a listener
 * left behind on every pass would be a leak Node starts warning about within
 * a minute.
 */
const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

async function context(reason: string): Promise<UseCaseContext> {
  return {
    db,
    clock: {
      now: () => new Date(),
      today: (timeZone: string = APP_TIMEZONE) => dayOf(new Date(), timeZone),
    },
    ids: idGenerator,
    ports: { hasher: argon2Hasher, tokens: nodeTokens },
    actor: systemActor(`worker: ${reason}`),
    // One id per job run, so every write it causes is tied together (§14).
    correlationId: crypto.randomUUID(),
    config: await currentConfig(),
  };
}

/* -------------------------------------------------------------------------- */
/* The lock                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One connection, held for the life of the process, so the session lock has
 * a session to live in. The pool the jobs use is a different thing: a pooled
 * connection is handed back and reused, and a lock taken on one would be
 * released by whichever query happened to close that session.
 */
function lockConnection(): postgres.Sql {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is not set. The worker connects as app_web, like the web applications.');
  }
  // `max_lifetime: null`: postgres.js otherwise recycles a connection after
  // 30 to 60 minutes, which ends the session, drops the lock, and is read
  // below as the lock being lost.
  return postgres(url, { max: 1, max_lifetime: null, onnotice: () => undefined });
}

async function tryLock(sql: postgres.Sql): Promise<boolean> {
  const [row] = await sql<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`;
  return row?.locked === true;
}

/**
 * Which server session this connection is. The driver reconnects quietly when
 * an idle socket is closed under it (a database restart, a failover, a
 * proxy's idle timeout), and a fresh session holds no lock: a plain `SELECT 1`
 * would answer cheerfully from the new one. The backend pid changes when the
 * session does, which is the thing to watch.
 */
async function sessionPid(sql: postgres.Sql): Promise<number> {
  const [row] = await sql<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
  return row?.pid ?? -1;
}

/* -------------------------------------------------------------------------- */
/* The loop                                                                    */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  refuseToStartUnconfigured(WEB_RUNTIME_RULES);

  try {
    await refuseUnlessContractMatches();
  } catch (error) {
    process.stderr.write(
      `worker: cannot start: ${describe(error)}\n` +
        'Check DATABASE_URL and that Postgres is up (`pnpm services:up`), then that the database is ' +
        'bootstrapped (`pnpm db:bootstrap`) or seeded (`pnpm db:seed`).\n',
    );
    process.exit(1);
  }

  const controller = new AbortController();
  const { signal } = controller;
  // Read through a call, not a property: the flag is flipped by a signal
  // handler after the loop has started, which control-flow narrowing cannot see.
  const stopped = (): boolean => signal.aborted;
  const stop = (reason: string): void => {
    if (stopped()) {
      // A second signal means "now": a job stuck in a mail provider's timeout
      // is not worth waiting out on a developer's terminal. In production the
      // supervisor's kill does the same.
      process.stderr.write(`${reason} again: exiting without waiting\n`);
      process.exit(130);
    }
    out(`stopping: ${reason}`);
    controller.abort();
  };
  process.on('SIGINT', () => { stop('SIGINT'); });
  process.on('SIGTERM', () => { stop('SIGTERM'); });

  const lock = lockConnection();

  try {
    /* --- stand by until the lock is ours ----------------------------------- */
    let standingBy = false;
    while (!stopped()) {
      if (await tryLock(lock)) break;
      if (!standingBy) {
        out('another worker holds the lock; standing by');
        standingBy = true;
      }
      await sleep(STANDBY_MS, signal);
    }
    if (stopped()) return;

    const heldBy = await sessionPid(lock);

    out(
      `worker started, contract ${CONTRACT_VERSION}: ` +
        JOBS.map((job) => `${job.name} every ${job.everyMs / SECOND}s`).join(', '),
    );

    /* --- run what is due, for as long as the lock holds -------------------- */
    const lastRuns = new Map<string, number>();

    while (!stopped()) {
      const now = Date.now();

      for (const job of dueJobs(JOBS, lastRuns, now)) {
        lastRuns.set(job.name, now);
        try {
          const line = await job.run(await context(job.name));
          if (line !== undefined) out(`${job.name}: ${line}`);
        } catch (error) {
          // Logged, never fatal: the next job is unrelated, and this one runs
          // again on its own schedule.
          process.stderr.write(`${job.name} failed: ${describe(error)}\n`);
        }
      }

      /*
       * The lock is only as alive as its session. A round trip each pass is
       * cheap; a failed one, or one answered by a different backend, means the
       * session that held the lock is gone and another worker may already hold
       * it: exit, and let the supervisor bring this one back as a standby.
       */
      try {
        const pid = await sessionPid(lock);
        if (pid !== heldBy) {
          process.stderr.write(
            `worker: the lock session was replaced (backend ${heldBy} became ${pid}); exiting\n`,
          );
          process.exitCode = 1;
          return;
        }
      } catch (error) {
        process.stderr.write(`worker: the lock connection was lost (${describe(error)}); exiting\n`);
        process.exitCode = 1;
        return;
      }

      await sleep(Math.min(IDLE_MS, Math.max(SECOND, msUntilNextDue(JOBS, lastRuns, Date.now()))), signal);
    }
  } finally {
    // Releases the lock with the session. The standby, if any, takes over.
    await lock.end({ timeout: 5 });
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((error: unknown) => {
    process.stderr.write(`worker failed to start: ${describe(error)}\n`);
    process.exit(1);
  });
