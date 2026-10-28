import { NextResponse } from 'next/server';

import { neededNow, type NeededNow } from '@obdm/bot';

import { botRuntime } from '@/lib/bot';

/**
 * What is needed right now, by group (§5): the chat's welcome screen polls it.
 *
 * Public and read-only, and it carries a group and a number of units only, so
 * there is nothing in it about any one patient or donor. Every visitor polling
 * it would otherwise be a database query each, so the answer is held for a few
 * seconds and shared: a need that is fifteen seconds old is still live.
 */
export const dynamic = 'force-dynamic';

const FRESH_MS = 15_000;

// The promise is what is shared, so a burst arriving as the answer goes stale
// waits on one query rather than starting one each.
let shared: { readonly at: number; readonly needs: Promise<NeededNow> } | undefined;

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  if (shared === undefined || now - shared.at > FRESH_MS) {
    const needs = botRuntime()
      .context()
      .then((ctx) => neededNow(ctx));
    shared = { at: now, needs };
    // A failed read is not kept: the next request tries again.
    needs.catch(() => {
      shared = undefined;
    });
  }
  const { at, needs } = shared;

  try {
    return NextResponse.json(
      { needs: await needs, asOf: new Date(at).toISOString() },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
