import { describe, expect, it } from 'vitest';

import { dueJobs, msUntilNextDue } from './schedule.js';

const jobs = [
  { name: 'drain', everyMs: 15_000 },
  { name: 'hourly', everyMs: 3_600_000 },
] as const;

describe('dueJobs (§11.1)', () => {
  it('runs everything on the first pass', () => {
    expect(dueJobs(jobs, new Map(), 1_000_000).map((j) => j.name)).toEqual(['drain', 'hourly']);
  });

  it('runs a job again only once its interval has passed', () => {
    const last = new Map([
      ['drain', 1_000_000],
      ['hourly', 1_000_000],
    ]);
    expect(dueJobs(jobs, last, 1_014_999)).toEqual([]);
    expect(dueJobs(jobs, last, 1_015_000).map((j) => j.name)).toEqual(['drain']);
    expect(dueJobs(jobs, last, 4_600_000).map((j) => j.name)).toEqual(['drain', 'hourly']);
  });
});

describe('msUntilNextDue', () => {
  it('is zero when something is due now', () => {
    expect(msUntilNextDue(jobs, new Map(), 5)).toBe(0);
  });

  it('is the shortest wait among the jobs', () => {
    const last = new Map([
      ['drain', 1_000_000],
      ['hourly', 1_000_000],
    ]);
    expect(msUntilNextDue(jobs, last, 1_005_000)).toBe(10_000);
    expect(msUntilNextDue(jobs, last, 1_015_000)).toBe(0);
  });

  it('never waits on an empty schedule', () => {
    expect(msUntilNextDue([], new Map(), 1)).toBe(0);
  });
});
