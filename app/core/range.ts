import type { Range } from './models';

export type RangeKey = 'year' | 'last90' | 'last30' | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build a Range for a named preset.
 * - year    : Jan 1 of the current UTC year to now (the default Wrapped range)
 * - last90  : rolling 90 days
 * - last30  : rolling 30 days
 * - all     : Unix epoch to now
 * `now` is injectable so tests are deterministic.
 */
export function rangeFor(key: RangeKey, now: Date = new Date()): Range {
  const end = new Date(now.getTime());
  switch (key) {
    case 'year': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      return { start, end };
    }
    case 'last90':
      return { start: new Date(end.getTime() - 90 * DAY_MS), end };
    case 'last30':
      return { start: new Date(end.getTime() - 30 * DAY_MS), end };
    case 'all':
      return { start: new Date(0), end };
  }
}

export function isRangeKey(value: unknown): value is RangeKey {
  return value === 'year' || value === 'last90' || value === 'last30' || value === 'all';
}

/** True if `ts` (unix seconds) falls inside `range`, inclusive. */
export function inRange(ts: number, range: Range): boolean {
  const s = Math.floor(range.start.getTime() / 1000);
  const e = Math.floor(range.end.getTime() / 1000);
  return ts >= s && ts <= e;
}
