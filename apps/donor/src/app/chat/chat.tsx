'use client';

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';

import { Button, cn } from '@obdm/ui';

/**
 * The chat screen (§5, §8, ADR 0017).
 *
 * A transcript and a composer. Everything the person sees is a row the server
 * wrote, and everything they do is one POST: a message, a tap, or opening the
 * application. The screen holds no state of its own beyond what is typed and
 * not yet sent, so a reload, a reinstall or a second tab all show the same
 * conversation.
 *
 * Buttons under a message are the bot's choices. Once a question is answered
 * the server edits that message's buttons in place (§8): the one chosen is
 * ticked, the rest are dimmed and inert, and the question stays readable.
 *
 * Somebody new is not asked anything on arrival. They see what this is, what
 * is needed now (the panel above), and a button to register; the questions
 * start when they press it or type something. A request link is different:
 * it opens on that request, onboarding first if need be (§5).
 *
 * Polling, not a socket: a request card, a stand-down or a thank-you arrives
 * from the ticker between a person's own messages, on the scale of seconds to
 * minutes, and the poll stops while the tab is hidden.
 */

type Choice = {
  readonly label: string;
  readonly data: string;
  readonly state?: 'chosen' | 'unavailable';
};

type Row = {
  readonly id: string;
  readonly direction: 'in' | 'out';
  readonly text: string;
  readonly choices: readonly Choice[] | null;
  readonly at: string;
};

type Outgoing =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'choice'; readonly data: string; readonly messageRef: string }
  | { readonly kind: 'open'; readonly publicId?: string };

const POLL_MS = 6000;

const PROBLEM =
  'Could not reach OBDM. Check your connection and try again; nothing you said has been lost.';

const TOO_FAST = 'That was quick. Give it a moment, then try again.';

/** A reply the server refused, with the status that says why. */
class SendRefused extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`send ${String(status)}`);
    this.status = status;
  }
}

async function read(): Promise<readonly Row[]> {
  const response = await fetch('/api/chat', {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`transcript ${String(response.status)}`);
  const payload = (await response.json()) as { messages: readonly Row[] };
  return payload.messages;
}

async function send(body: Outgoing): Promise<readonly Row[]> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new SendRefused(response.status);
  const payload = (await response.json()) as { messages: readonly Row[] };
  return payload.messages;
}

const timeOf = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export function Chat({ requestId }: { requestId: string | null }) {
  const [rows, setRows] = useState<readonly Row[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** True when the server took it. */
  const post = useCallback(async (body: Outgoing): Promise<boolean> => {
    setBusy(true);
    setProblem(null);
    try {
      setRows(await send(body));
      return true;
    } catch (error) {
      setProblem(error instanceof SendRefused && error.status === 429 ? TOO_FAST : PROBLEM);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  /* --- first open ------------------------------------------------------ */
  useEffect(() => {
    // An object, not a boolean: the flag is flipped by the cleanup below after
    // the closure has started, which control-flow narrowing cannot see.
    const run = { cancelled: false };

    void (async () => {
      try {
        const transcript = await read();
        if (run.cancelled) return;

        if (requestId !== null) {
          // The link is consumed once it has been taken. Leaving it in the
          // address bar would reopen the same request on every reload; taking
          // it out before the server has it would lose it on the first refusal.
          const taken = await post({ kind: 'open', publicId: requestId });
          if (taken) window.history.replaceState(null, '', '/chat');
          return;
        }

        // An empty transcript is somebody new: the welcome below, and nothing
        // asked of them until they choose to register.
        setRows(transcript);
      } catch {
        if (run.cancelled) return;
        setRows([]);
        setProblem(PROBLEM);
      }
    })();

    return () => {
      run.cancelled = true;
    };
  }, [requestId, post]);

  /* --- what arrives between messages ----------------------------------- */
  useEffect(() => {
    const refresh = (): void => {
      if (document.visibilityState !== 'visible' || busy) return;
      read().then(setRows).catch(() => undefined);
    };

    const timer = setInterval(refresh, POLL_MS);
    // Coming back to the tab is the moment a reply is most likely waiting.
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [busy]);

  /* --- keep the newest message in view --------------------------------- */
  const newest = rows?.at(-1)?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [newest]);

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const text = draft.trim();
    if (text.length === 0 || busy) return;
    setDraft('');
    // The message above the composer promises nothing was lost. Keep it true:
    // what the server did not take goes back where it was typed, ahead of
    // anything typed while it was in flight.
    void post({ kind: 'text', text }).then((taken) => {
      if (!taken) setDraft((current) => (current === '' ? text : `${text} ${current}`));
    });
    inputRef.current?.focus();
  };

  const tap = (row: Row, choice: Choice): void => {
    if (busy) return;
    void post({ kind: 'choice', data: choice.data, messageRef: row.id });
  };

  /** Opening the conversation: the greeting and the first question (§5). */
  const register = (): void => {
    if (busy) return;
    void post({ kind: 'open' });
  };

  return (
    <>
      <main
        id="main"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-4"
      >
        {rows === null ? (
          <p role="status" className="py-10 text-center text-sm text-ink-muted">
            Opening your conversation…
          </p>
        ) : rows.length === 0 ? (
          <Welcome busy={busy} onRegister={register} />
        ) : (
          rows.map((row) => <Bubble key={row.id} row={row} busy={busy} onTap={tap} />)
        )}
        <div ref={endRef} aria-hidden />
      </main>

      <footer className="sticky bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-2xl px-4 pt-3">
          {problem !== null ? (
            <p
              role="alert"
              className="mb-2 rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {problem}
            </p>
          ) : null}
          <form onSubmit={submit} className="flex items-end gap-2" noValidate>
            <input
              ref={inputRef}
              type="text"
              name="message"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              placeholder="Type a message"
              aria-label="Your message"
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="send"
              maxLength={500}
              className="h-11 min-w-0 flex-1 rounded-control border border-border-strong bg-surface px-3 text-base text-ink placeholder:text-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <Button type="submit" loading={busy} disabled={busy || draft.trim().length === 0} className="h-11">
              Send
            </Button>
          </form>
          <p className="py-2 text-xs text-ink-subtle">
            Not a medical device. The blood centre checks you on the day, before any donation.
          </p>
        </div>
      </footer>
    </>
  );
}

/**
 * What somebody new sees before anything is asked of them: what this is, and
 * the one action that starts it. The live needs are in the panel above.
 */
function Welcome({ busy, onRegister }: { busy: boolean; onRegister: () => void }) {
  return (
    <section aria-labelledby="welcome" className="flex flex-col gap-4 py-6">
      <h1 id="welcome" className="text-xl font-semibold text-ink">
        Give blood when someone nearby needs it
      </h1>
      <p className="text-sm text-ink-muted">
        Register once, and we message you here only when a patient near you needs your
        blood group. You choose each time whether you can come. The blood centre checks
        you on the day, before any donation.
      </p>
      <div className="flex flex-col items-start gap-2">
        <Button type="button" className="h-11" loading={busy} disabled={busy} onClick={onRegister}>
          Register as a donor
        </Button>
        <p className="text-xs text-ink-subtle">
          About a minute. Nothing is saved until you agree at the end.
        </p>
      </div>
    </section>
  );
}

function Bubble({
  row,
  busy,
  onTap,
}: {
  row: Row;
  busy: boolean;
  onTap: (row: Row, choice: Choice) => void;
}) {
  if (row.direction === 'in') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]" data-direction="in">
          <p className="whitespace-pre-wrap break-words rounded-card rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white">
            {row.text}
          </p>
          <p className="mt-1 text-right text-[11px] text-ink-subtle">
            <time dateTime={row.at}>{timeOf(row.at)}</time>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2" data-direction="out">
        <p className="whitespace-pre-wrap break-words rounded-card rounded-bl-sm border border-border bg-surface px-4 py-2.5 text-sm text-ink shadow-card">
          {row.text}
        </p>
        {row.choices !== null && row.choices.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choices">
            {row.choices.map((choice) => (
              <ChoiceButton
                key={`${row.id}:${choice.data}:${choice.label}`}
                choice={choice}
                busy={busy}
                onTap={() => {
                  onTap(row, choice);
                }}
              />
            ))}
          </div>
        ) : null}
        <p className="text-[11px] text-ink-subtle">
          <time dateTime={row.at}>{timeOf(row.at)}</time>
        </p>
      </div>
    </div>
  );
}

/**
 * One button, in whichever of the three states it is in (§8).
 *
 * The chosen one is ticked and the rest are dimmed, both as a label and as a
 * disabled control, so the answer is visible to a screen reader as well as to
 * an eye. Never removed: somebody scrolling back should see what they were
 * asked as well as what they said.
 */
function ChoiceButton({
  choice,
  busy,
  onTap,
}: {
  choice: Choice;
  busy: boolean;
  onTap: () => void;
}) {
  const chosen = choice.state === 'chosen';
  const inert = choice.state === 'unavailable';

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={chosen || inert || busy}
      aria-pressed={chosen}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-left text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        chosen && 'border-primary/40 bg-primary-soft text-primary',
        inert && 'border-border bg-surface-muted text-ink-subtle opacity-70',
        !chosen && !inert && 'border-border-strong bg-surface text-ink hover:bg-surface-muted disabled:opacity-60',
      )}
    >
      {chosen ? (
        <span aria-hidden className="text-base leading-none">
          ✓
        </span>
      ) : null}
      {choice.label}
    </button>
  );
}
