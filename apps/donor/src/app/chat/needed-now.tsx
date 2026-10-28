'use client';

import { useEffect, useState } from 'react';

import { bloodGroupLabel, type BloodGroup } from '@obdm/domain';

/**
 * Blood needed right now, by group (§5), kept live while the page is open.
 *
 * Only a group and a count of units: the public face of the board, the same
 * for every visitor, registered or not. It sits outside the conversation's
 * live region, so a refresh is not read out to a screen reader every half
 * minute.
 */

type Need = { readonly bloodGroup: string; readonly units: number };

const POLL_MS = 30_000;

async function fetchNeeds(): Promise<readonly Need[]> {
  const response = await fetch('/api/needs', { cache: 'no-store', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`needs ${String(response.status)}`);
  return ((await response.json()) as { needs: readonly Need[] }).needs;
}

export function NeededNow() {
  const [needs, setNeeds] = useState<readonly Need[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const refresh = (): void => {
      if (document.visibilityState !== 'visible') return;
      fetchNeeds()
        .then((fresh) => {
          setNeeds(fresh);
          setFailed(false);
        })
        .catch(() => {
          setFailed(true);
        });
    };

    refresh();
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return (
    <section
      aria-labelledby="needed-now"
      className="border-b border-border bg-surface"
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-3">
        <h2 id="needed-now" className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          Blood needed now
        </h2>
        {needs === null ? (
          <p className="mt-2 text-sm text-ink-muted">
            {failed ? 'Could not load what is needed. It will try again shortly.' : 'Loading…'}
          </p>
        ) : needs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Nothing is needed right now. That is good news.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {needs.map((need) => (
              <li
                key={need.bloodGroup}
                className="flex items-baseline gap-1.5 rounded-control border border-primary/30 bg-primary-soft px-3 py-1.5"
              >
                <span className="font-mono text-sm font-semibold text-primary">
                  {bloodGroupLabel(need.bloodGroup as BloodGroup)}
                </span>
                <span className="text-sm text-ink">
                  {need.units} {need.units === 1 ? 'unit' : 'units'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
