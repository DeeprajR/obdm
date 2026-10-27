import 'server-only';

import {
  createBotConfigCache,
  createBotDatabase,
  createChannelRegistry,
  createWebChannel,
  withLogging,
  type BotContext,
  type BotDatabase,
  type ChannelRegistry,
  type WebChannel,
} from '@obdm/bot';
import { APP_TIMEZONE, dayOf } from '@obdm/domain';
import { idGenerator } from '@obdm/ids';

/**
 * The bot, running inside this application (ADR 0017).
 *
 * What `apps/bot/main.ts` used to assemble at boot, assembled once here and
 * shared by the chat route and the ticker: the `app_bot` connection, the web
 * channel, the registry delivery is looked up in, and the configuration
 * cache. One instance per process, held on `globalThis` so a development
 * reload does not open a second connection pool beside the first.
 *
 * This is the only file in the application that names the connection. It
 * connects as `app_bot` and nothing else: the privacy boundary of §5.1 is a
 * missing grant, and this application holds no other role's URL to reach for.
 */
export type BotRuntime = {
  readonly db: BotDatabase;
  /** The channel itself, for the transcript reads and writes the chat route makes. */
  readonly web: WebChannel;
  /** Delivery is a lookup by the row's own channel, never one global port. */
  readonly channel: ChannelRegistry;
  /** A fresh use-case context: one correlation id per pass or request (§14). */
  readonly context: () => Promise<BotContext>;
  /** One line per update received and per message sent, phone numbers masked. */
  readonly log: (line: string) => void;
};

/** On unless `BOT_LOG=off`, as the separate process was. */
const CONVERSATION_LOG = (process.env['BOT_LOG'] ?? 'on') !== 'off';

export const logLine = (line: string): void => {
  const at = new Date().toISOString().slice(11, 23);
  process.stdout.write(`${at} ${line}\n`);
};

function create(): BotRuntime {
  const db = createBotDatabase();
  const web = createWebChannel(db);
  const channel = createChannelRegistry(CONVERSATION_LOG ? withLogging(web, logLine) : web);
  const config = createBotConfigCache(db);

  return {
    db,
    web,
    channel,
    log: CONVERSATION_LOG ? logLine : () => undefined,
    context: async () => ({
      db,
      clock: {
        now: () => new Date(),
        today: (timeZone: string = APP_TIMEZONE) => dayOf(new Date(), timeZone),
      },
      ids: idGenerator,
      channel,
      config: await config.get(),
      correlationId: crypto.randomUUID(),
    }),
  };
}

const holder = globalThis as unknown as { __obdmBot?: BotRuntime };

export function botRuntime(): BotRuntime {
  holder.__obdmBot ??= create();
  return holder.__obdmBot;
}
