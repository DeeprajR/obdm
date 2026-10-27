import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { botRuntime } from '@/lib/bot';

/**
 * The load balancer's probe (§11.9). Shallow, public and uninformative.
 *
 * One database round trip as `app_bot` and one word back. The detailed state
 * of the bot, its backlog, its overdue waves, reaches the control panel on
 * `process_health`, published by the ticker, which is the same boundary every
 * other bot fact crosses.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    await botRuntime().db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
