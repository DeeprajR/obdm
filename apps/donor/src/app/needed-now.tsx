'use client';

import { useEffect, useState } from 'react';

import { BLOOD_GROUPS, bloodGroupLabel, type BloodGroup } from '@obdm/domain';

/**
 * Blood needed right now, by group (§5), kept live while the page is open.
 *
 * Only a group and a count of units: the public face of the board, the same
 * for every visitor, registered or not. It sits outside the conversation's
 * live region, so a refresh is not read out to a screen reader every half
 * minute.
 *
 * Two faces on one feed: a strip above the chat, and a panel on the landing
 * page that shows every group, the ones not needed included.
 */

type Need = { readonly bloodGroup: string; readonly units: number };

const POLL_MS = 30_000;

async function fetchNeeds(): Promise<readonly Need[]> {
  const response = await fetch('/api/needs', { cache: 'no-store', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`needs ${String(response.status)}`);
  return ((await response.json()) as { needs: readonly Need[] }).needs;
}

function useNeeds(): { readonly needs: readonly Need[] | null; readonly failed: boolean } {
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

  return { needs, failed };
}

const units = (count: number): string => `${String(count)} ${count === 1 ? 'unit' : 'units'}`;

export function NeededNow() {
  const { needs, failed } = useNeeds();

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
                <span className="text-sm text-ink">{units(need.units)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Every group, in the board's order, with the units it needs (0 when none). */
export function DemandByGroup() {
  const { needs, failed } = useNeeds();
  const byGroup = new Map(needs?.map((need) => [need.bloodGroup, need.units]));

  return (
    <section aria-labelledby="demand-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="demand-heading" className="text-lg font-semibold text-ink">
          Blood needed now
        </h2>
        <p className="text-xs text-ink-subtle">
          {failed
            ? 'Could not refresh. It will try again shortly.'
            : 'Live, by blood group. Refreshes every 30 seconds.'}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BLOOD_GROUPS.map((group) => {
          const count = byGroup.get(group) ?? 0;
          const needed = count > 0;
          return (
            <li
              key={group}
              className={
                needed
                  ? 'flex flex-col gap-1 rounded-card border border-primary/40 bg-primary-soft p-4'
                  : 'flex flex-col gap-1 rounded-card border border-border bg-surface p-4'
              }
            >
              <span
                className={`font-mono text-xl font-semibold ${needed ? 'text-primary' : 'text-ink-subtle'}`}
              >
                {bloodGroupLabel(group)}
              </span>
              <span className={`text-sm ${needed ? 'font-medium text-ink' : 'text-ink-subtle'}`}>
                {needs === null ? '…' : needed ? `${units(count)} needed` : 'Not needed'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
