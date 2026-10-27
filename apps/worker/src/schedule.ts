/**
 * Which jobs are due (§11.1).
 *
 * Pure, so the cadence can be tested without waiting an hour. A job is due
 * when it has never run, or when its last run started at least its interval
 * ago. The last run is recorded whether or not the job succeeded: a job that
 * throws every time must not be retried every tick, and its error is on the
 * terminal where somebody will read it.
 */

export type JobName = string;

export type Scheduled = {
  readonly name: JobName;
  readonly everyMs: number;
};

export type LastRuns = ReadonlyMap<JobName, number>;

export function dueJobs<T extends Scheduled>(
  jobs: readonly T[],
  lastRuns: LastRuns,
  nowMs: number,
): readonly T[] {
  return jobs.filter((job) => {
    const last = lastRuns.get(job.name);
    return last === undefined || nowMs - last >= job.everyMs;
  });
}

/** When the next job falls due, so the loop sleeps no longer than it must. */
export function msUntilNextDue(
  jobs: readonly Scheduled[],
  lastRuns: LastRuns,
  nowMs: number,
): number {
  let soonest = Number.POSITIVE_INFINITY;
  for (const job of jobs) {
    const last = lastRuns.get(job.name);
    const at = last === undefined ? nowMs : last + job.everyMs;
    soonest = Math.min(soonest, Math.max(0, at - nowMs));
  }
  return Number.isFinite(soonest) ? soonest : 0;
}
