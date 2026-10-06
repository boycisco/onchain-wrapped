import { describe, it, expect } from 'vitest';
import { analyzeTiming } from '@/app/analysis/timing';
import { makeActivity, makeRange, tx, at } from '../fixtures/build';

describe('analyzeTiming - empty', () => {
  it('returns zeroed buckets and null busiest fields', () => {
    const s = analyzeTiming(makeActivity([], makeRange()));
    expect(s.total).toBe(0);
    expect(s.byHour).toHaveLength(24);
    expect(s.byDayOfWeek).toHaveLength(7);
    expect(s.byMonth).toHaveLength(12);
    expect(s.byHour.every((b) => b.count === 0 && b.fraction === 0)).toBe(true);
    expect(s.busiestHour).toBeNull();
    expect(s.busiestDayOfWeek).toBeNull();
    expect(s.busiestMonth).toBeNull();
    expect(s.day).toEqual({ key: 'day', count: 0, fraction: 0 });
    expect(s.night).toEqual({ key: 'night', count: 0, fraction: 0 });
    expect(s.lateNight).toEqual({ key: 'late', count: 0, fraction: 0 });
    expect(s.weekday).toEqual({ key: 'weekday', count: 0, fraction: 0 });
    expect(s.weekend).toEqual({ key: 'weekend', count: 0, fraction: 0 });
  });
});

describe('analyzeTiming - hour of day', () => {
  it('buckets by UTC hour', () => {
    const txs = [
      tx('0xa', at('2026-03-01', 3, 0)),
      tx('0xb', at('2026-03-01', 3, 30)),
      tx('0xc', at('2026-03-01', 14, 0)),
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.byHour[3]!.count).toBe(2);
    expect(s.byHour[14]!.count).toBe(1);
    expect(s.busiestHour).toEqual({ key: 3, count: 2, fraction: 0.6667 });
  });

  it('breaks ties on busiest hour by earliest hour', () => {
    const txs = [
      tx('0xa', at('2026-03-01', 20, 0)),
      tx('0xb', at('2026-03-01', 5, 0)),
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.busiestHour?.key).toBe(5);
  });
});

describe('analyzeTiming - day of week', () => {
  it('buckets Sun=0..Sat=6 in UTC', () => {
    // 2026-03-01 is a Sunday (UTC).
    const txs = [
      tx('0xa', at('2026-03-01', 12, 0)), // Sun
      tx('0xb', at('2026-03-02', 12, 0)), // Mon
      tx('0xc', at('2026-03-02', 13, 0)), // Mon
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.byDayOfWeek[0]!.count).toBe(1);
    expect(s.byDayOfWeek[1]!.count).toBe(2);
    expect(s.busiestDayOfWeek?.key).toBe(1);
  });
});

describe('analyzeTiming - day vs night', () => {
  it('day is 06:00-17:59 UTC and night is 18:00-05:59 UTC', () => {
    const txs = [
      tx('0xa', at('2026-03-01', 6, 0)),   // day boundary
      tx('0xb', at('2026-03-01', 17, 59)), // day end
      tx('0xc', at('2026-03-01', 18, 0)),  // night start
      tx('0xd', at('2026-03-02', 5, 59)),  // night end
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.day.count).toBe(2);
    expect(s.night.count).toBe(2);
    expect(s.day.fraction).toBe(0.5);
    expect(s.night.fraction).toBe(0.5);
  });
});

describe('analyzeTiming - late-night', () => {
  it('late-night is 23:00-04:59 UTC and is a subset of night', () => {
    const txs = [
      tx('0xa', at('2026-03-01', 23, 0)),  // late
      tx('0xb', at('2026-03-02', 4, 59)),  // late boundary
      tx('0xc', at('2026-03-02', 5, 0)),   // not late (night)
      tx('0xd', at('2026-03-01', 22, 59)), // not late (night)
      tx('0xe', at('2026-03-01', 12, 0)),  // day
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.lateNight.count).toBe(2);
    // Night = late (2) + the two non-late-night entries (22:59 and 05:00) = 4
    expect(s.night.count).toBe(4);
  });
});

describe('analyzeTiming - weekday vs weekend', () => {
  it('splits on UTC day-of-week', () => {
    // 2026-03-01 Sunday, 2026-03-02 Monday, 2026-03-07 Saturday.
    const txs = [
      tx('0xa', at('2026-03-01', 12, 0)), // Sun
      tx('0xb', at('2026-03-07', 12, 0)), // Sat
      tx('0xc', at('2026-03-02', 12, 0)), // Mon
      tx('0xd', at('2026-03-03', 12, 0)), // Tue
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.weekend.count).toBe(2);
    expect(s.weekday.count).toBe(2);
    expect(s.weekend.fraction).toBe(0.5);
    expect(s.weekday.fraction).toBe(0.5);
  });
});

describe('analyzeTiming - month', () => {
  it('buckets by UTC month and picks the busiest', () => {
    const txs = [
      tx('0xa', at('2026-01-10', 12, 0)),
      tx('0xb', at('2026-03-10', 12, 0)),
      tx('0xc', at('2026-03-11', 12, 0)),
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.byMonth[0]!.count).toBe(1);  // Jan
    expect(s.byMonth[2]!.count).toBe(2);  // Mar
    expect(s.busiestMonth?.key).toBe(2);
  });

  it('breaks ties on busiest month by earliest month', () => {
    const txs = [
      tx('0xa', at('2026-08-10', 12, 0)),
      tx('0xb', at('2026-02-10', 12, 0)),
    ];
    const s = analyzeTiming(makeActivity(txs, makeRange()));
    expect(s.busiestMonth?.key).toBe(1); // Feb
  });
});