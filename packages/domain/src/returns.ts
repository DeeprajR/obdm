/**
 * A unit coming back to the centre: what may happen to it next (§4).
 *
 * Pure, and here rather than beside the use case that records the return,
 * because the centre's return form runs in the browser and greys out the
 * impossible choice before it is offered. A rule the screen needs has to be
 * importable by the screen; the use case in `packages/centre` re-reads the
 * same function, so the form and the refusal cannot disagree.
 */

export type StorageBand = 'under_30m' | '30m_to_limit' | 'over_limit' | 'unknown';
export type ReturnOutcome = 'restock' | 'quarantine' | 'discard';

/**
 * What the centre is *allowed* to do with a returned unit (§4).
 *
 * Restocking is a clinical judgement with a hard time limit in every
 * transfusion SOP. The threshold is configuration, and the conservative reading
 * of "we do not know" is quarantine, never the shelf.
 */
export function allowedOutcomes(band: StorageBand): readonly ReturnOutcome[] {
  return band === 'under_30m'
    ? ['restock', 'quarantine', 'discard']
    : ['quarantine', 'discard'];
}

export const defaultOutcome = (band: StorageBand): ReturnOutcome =>
  band === 'under_30m' ? 'restock' : 'quarantine';
