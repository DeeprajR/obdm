import postgres from 'postgres';

/**
 * The few things the suite does to the database directly.
 *
 * As the migrator, because that is the role `.env` gives the suite, and only
 * for what the demo plan does by hand: the public-board flag (§3.4) and the
 * outbox rows left for the in-memory pool (§3.5). Nothing here is an
 * assertion path; the tests read the screens.
 */

const url = (): string => {
  const value = process.env['MIGRATION_DATABASE_URL'];
  if (!value) {
    throw new Error('MIGRATION_DATABASE_URL is not set. Copy .env.example to .env at the workspace root.');
  }
  return value;
};

export async function withDatabase<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(url(), { max: 1, onnotice: () => undefined });
  try {
    return await work(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Publishes the board, as demo-plan §3.4 does by hand. */
export async function publishBoard(): Promise<void> {
  await withDatabase(async (sql) => {
    await sql`INSERT INTO hospital.app_config (key, value) VALUES ('flag.public_board', 'true'::jsonb)
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  });
}

/**
 * Drops outbox rows queued for the seeded in-memory pool, so the control
 * panel starts green and a real donor's reply is not behind them (demo-plan
 * §3.5). Only rows for channels nothing delivers; the web channel's are kept.
 */
export async function clearUndeliverableBacklog(): Promise<number> {
  return withDatabase(async (sql) => {
    const rows = await sql`DELETE FROM bot.message_outbox
                            WHERE status = 'pending' AND channel <> 'web'
                            RETURNING id`;
    return rows.length;
  });
}
