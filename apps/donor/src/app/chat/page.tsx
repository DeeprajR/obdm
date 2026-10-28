import type { Metadata } from 'next';
import Link from 'next/link';

import { Chat } from './chat';
import { NeededNow } from '../needed-now';

export const metadata: Metadata = { title: 'OBDM · Donors' };

/** Always live: the transcript is read on every open, never from a cache. */
export const dynamic = 'force-dynamic';

const PUBLIC_ID = /^[A-Za-z0-9_-]{4,64}$/;

/**
 * The chat (§5, ADR 0017).
 *
 * The donor's whole interface is this one screen; `/` is the landing page that
 * leads here and to the staff applications. Public by design: a donor has no
 * account, and who they are is the device cookie the chat route resolves.
 * Nothing is rendered here from the database; the client fetches its own
 * transcript, which is what keeps this page cacheable as a shell and keeps a
 * shared phone from ever being served somebody else's conversation.
 *
 * `?r=<public id>` is a request link, the web form of the deep link a poster
 * or a forwarded message carries. It is handed to the chat, which opens on
 * that request (§5: "the link is never lost").
 */
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const link = params['r'];
  const requestId = typeof link === 'string' && PUBLIC_ID.test(link) ? link : null;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link href="/" aria-label="OBDM home" className="shrink-0">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-control bg-primary text-sm font-bold text-white"
          >
            O
          </span>
        </Link>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-ink">OBDM</p>
          <p className="truncate text-xs text-ink-subtle">Donors · we message you when a patient nearby needs your group</p>
        </div>
      </header>

      <NeededNow />
      <Chat requestId={requestId} />
    </div>
  );
}
