import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Offline · OBDM' };

/** Rendered statically so the service worker can cache it at install time (§2.8). */
export const dynamic = 'force-static';

/**
 * What the service worker serves when a navigation cannot reach the server.
 *
 * It carries no data. The conversation lives on the server and is read back
 * on every open, so nothing a person said is lost by being offline; what they
 * cannot do is send, and this says so rather than showing a stored chat that
 * may since have moved on.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 p-6"
      >
        <div role="status" className="rounded-card border border-warning/30 bg-warning-soft p-6">
          <h1 className="text-base font-semibold text-warning">You are offline</h1>
          <p className="mt-2 text-sm text-ink">
            OBDM needs a connection to send or receive messages. Nothing you
            said is lost: your conversation is kept on the server and will be here
            when you reconnect.
          </p>
        </div>
        <p className="text-sm text-ink-muted">Reconnect and reload this page.</p>
      </main>
    </div>
  );
}
