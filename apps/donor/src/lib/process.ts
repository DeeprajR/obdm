import { tick } from '@obdm/bot';
import { CONTRACT_VERSION, checkContractVersion } from '@obdm/contract';
import { appConfig } from '@obdm/db';

import { botRuntime } from './bot';

/**
 * The ticker, inside the web server (§1, §11.2, ADR 0017).
 *
 * The bot used to be two loops in a process of its own: one long-polling a
 * chat platform, one ticking. The web channel has no poll to run, so what is
 * left is the ticker, and it runs here, started once when the server starts.
 * It polls **columns**, never in-memory timers, so a restart resumes rather
 * than losing escalation (§5.7), and a second instance of this application is
 * a second ticker, which the conditional updates and leases already allow.
 *
 * The boot checks are the ones the old process ran: a contract-version
 * mismatch refuses to start rather than running wrong (§6, §13).
 */

const TICK_INTERVAL_MS = Number(process.env['BOT_TICK_INTERVAL_MS'] ?? '15000');

type Ticker = { readonly stop: () => void };

const holder = globalThis as unknown as { __obdmTicker?: Ticker };

const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
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

async function refuseUnlessContractMatches(): Promise<void> {
  const { db } = botRuntime();
  const rows = await db.select({ key: appConfig.key, value: appConfig.value }).from(appConfig);
  const stored = rows.find((row) => row.key === 'contract.version')?.value;
  // The column is jsonb, so a string arrives as a string and anything else is
  // a misconfiguration rather than something to coerce.
  const found = typeof stored === 'string' ? stored : '';
  const version = checkContractVersion(found);
  if (!version.ok) {
    throw new Error(
      `contract version mismatch: this bot speaks ${CONTRACT_VERSION}, the database says ` +
        `${found || '(nothing: has the database been seeded?)'}. ${version.reason}`,
    );
  }
}

export async function startBotProcess(): Promise<void> {
  // A development reload re-runs instrumentation; one ticker is enough.
  if (holder.__obdmTicker) return;

  try {
    await refuseUnlessContractMatches();
    const health = await botRuntime().web.check();
    out(`channel web: ${health.ok ? 'ok' : 'UNREACHABLE'}: ${health.detail}`);
  } catch (error) {
    // A mismatched deploy or an unreachable database is a refused start, not
    // a server that answers the chat and silently recruits nobody (§13).
    process.stderr.write(
      `donor app: the bot cannot start: ${describe(error)}\n` +
        'Check BOT_DATABASE_URL in .env and that Postgres is up (`pnpm services:up`), then that ' +
        'the database is seeded (`pnpm db:seed`).\n',
    );
    process.exit(1);
  }

  // An object, not two locals: the flag is flipped by a signal handler after
  // the loop has started, which control-flow narrowing cannot see.
  const loop: { stopping: boolean; timer: NodeJS.Timeout | undefined } = {
    stopping: false,
    timer: undefined,
  };

  // Read through a call, not a property: narrowing does not survive one.
  const stopped = (): boolean => loop.stopping;

  const pass = async (): Promise<void> => {
    if (stopped()) return;
    try {
      const result = await tick(await botRuntime().context());
      const interesting =
        result.imported + result.wavesSent + result.cancelled + result.expired +
        result.completed + result.outcomesApplied + result.drain.sent;
      if (interesting > 0) {
        out(
          `tick: imported ${String(result.imported)}, waves ${String(result.wavesSent)} ` +
            `(${String(result.donorsNotified)} asked), cancelled ${String(result.cancelled)}, ` +
            `expired ${String(result.expired)}, completed ${String(result.completed)}, ` +
            `outcomes ${String(result.outcomesApplied)}, promoted ${String(result.promoted)}, ` +
            `sent ${String(result.drain.sent)}` +
            (result.drain.skipped > 0
              ? `, ${String(result.drain.skipped)} queued for a channel this process is not running`
              : ''),
        );
      }
    } catch (error) {
      // A failed pass must not stop the loop: the next one retries, and every
      // step it performs is idempotent by design.
      process.stderr.write(`tick failed: ${describe(error)}\n`);
    } finally {
      if (!stopped()) {
        loop.timer = setTimeout(() => void pass(), TICK_INTERVAL_MS);
        // Never the reason the process stays up.
        loop.timer.unref();
      }
    }
  };

  const stop = (): void => {
    loop.stopping = true;
    if (loop.timer) clearTimeout(loop.timer);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  holder.__obdmTicker = { stop };

  out(
    `donor app: bot ticking every ${String(TICK_INTERVAL_MS / 1000)}s.` +
      ((process.env['BOT_LOG'] ?? 'on') !== 'off'
        ? ' conversation log: on. "<-" is what arrived, "->" is what was sent. BOT_LOG=off silences it.'
        : ''),
  );
  void pass();
}
