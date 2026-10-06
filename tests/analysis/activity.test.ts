import { describe, it, expect } from 'vitest';
import { analyzeActivity } from '@/app/analysis/activity';
import {
  makeActivity,
  makeRange,
  tx,
  txsOnDay,
  at,
} from '../fixtures/build';

describe('analyzeActivity - empty', () => {
  it('returns zeros and nulls for an empty wallet', () => {
    const s = analyzeActivity(makeActivity([], makeRange()));
    expect(s.totalTransactions).toBe(0);
    expect(s.successfulTransactions).toBe(0);
    expect(s.failedTransactions).toBe(0);
    expect(s.unknownTransactions).toBe(0);
    expect(s.activeDays).toBe(0);
    expect(s.inactiveDays).toBe(0);
    expect(s.spanDays).toBe(0);
    expect(s.firstActivity).toBeNull();
    expect(s.lastActivity).toBeNull();
    expect(s.longestActiveStreak).toBe(0);
    expect(s.longestInactiveStreak).toBe(0);
    expect(s.transactionsPerActiveDay).toBe(0);
    expect(s.busiestDay).toBeNull();
    expect(s.busiestMonth).toBeNull();
  });
});

describe('analyzeActivity - status counting', () => {
  it('does not call unknown transactions successful', () => {
    const txs = [
      tx('0xa', at('2026-03-01'), 'success'),
      tx('0xb', at('2026-03-01'), 'failed'),
      tx('0xc', at('2026-03-01'), 'unknown'),
      tx('0xd', at('2026-03-01')),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.totalTransactions).toBe(4);
    expect(s.successfulTransactions).toBe(1);
    expect(s.failedTransactions).toBe(1);
    expect(s.unknownTransactions).toBe(2);
  });
});

describe('analyzeActivity - active days and span', () => {
  it('counts unique UTC days, not transactions', () => {
    const txs = [
      ...txsOnDay('2026-03-01', 3),
      ...txsOnDay('2026-03-02', 5),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.totalTransactions).toBe(8);
    expect(s.activeDays).toBe(2);
    expect(s.spanDays).toBe(2);
    expect(s.inactiveDays).toBe(0);
    expect(s.transactionsPerActiveDay).toBe(4);
  });

  it('counts interior gap days as inactive, not days before/after activity', () => {
    const txs = [
      tx('0xa', at('2026-03-01')),
      tx('0xb', at('2026-03-05')), // 3-day gap
      tx('0xc', at('2026-03-06')),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.activeDays).toBe(3);
    expect(s.spanDays).toBe(6); // Mar 1 -> Mar 6 inclusive
    expect(s.inactiveDays).toBe(3); // Mar 2, 3, 4
  });
});

describe('analyzeActivity - streaks', () => {
  it('finds longest active streak of consecutive days', () => {
    const txs = [
      tx('0xa', at('2026-03-01')),
      tx('0xb', at('2026-03-02')),
      tx('0xc', at('2026-03-03')),
      tx('0xd', at('2026-03-05')), // gap
      tx('0xe', at('2026-03-06')),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.longestActiveStreak).toBe(3);
  });

  it('finds longest inactive gap between active days', () => {
    const txs = [
      tx('0xa', at('2026-03-01')),
      tx('0xb', at('2026-03-05')), // 3-day gap
      tx('0xc', at('2026-03-06')),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.longestInactiveStreak).toBe(3);
  });

  it('reports zero inactive streak for a single active day', () => {
    const s = analyzeActivity(makeActivity([tx('0xa', at('2026-03-01'))], makeRange()));
    expect(s.longestActiveStreak).toBe(1);
    expect(s.longestInactiveStreak).toBe(0);
  });
});

describe('analyzeActivity - busiest day and month', () => {
  it('picks the day with the most transactions', () => {
    const txs = [
      ...txsOnDay('2026-03-01', 1),
      ...txsOnDay('2026-03-02', 7),
      ...txsOnDay('2026-03-03', 3),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.busiestDay).toEqual({ date: '2026-03-02', count: 7 });
  });

  it('breaks ties in busiest day by earliest date', () => {
    const txs = [
      ...txsOnDay('2026-03-05', 4),
      ...txsOnDay('2026-03-01', 4),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.busiestDay).toEqual({ date: '2026-03-01', count: 4 });
  });

  it('picks the month with the most transactions', () => {
    const txs = [
      ...txsOnDay('2026-01-10', 2),
      ...txsOnDay('2026-02-10', 5),
      ...txsOnDay('2026-03-10', 1),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.busiestMonth).toEqual({ month: '2026-02', count: 5 });
  });

  it('breaks ties in busiest month by earliest month', () => {
    const txs = [
      ...txsOnDay('2026-05-10', 3),
      ...txsOnDay('2026-02-10', 3),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.busiestMonth).toEqual({ month: '2026-02', count: 3 });
  });
});

describe('analyzeActivity - first and last activity', () => {
  it('reports ISO UTC timestamps for first and last activity', () => {
    const txs = [
      tx('0xa', at('2026-03-15', 9, 30)),
      tx('0xb', at('2026-03-20', 22, 45)),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.firstActivity).toBe('2026-03-15T09:30:00.000Z');
    expect(s.lastActivity).toBe('2026-03-20T22:45:00.000Z');
  });
});

describe('analyzeActivity - transactions per active day', () => {
  it('rounds to two decimals', () => {
    const txs = [
      ...txsOnDay('2026-03-01', 1),
      ...txsOnDay('2026-03-02', 1),
      ...txsOnDay('2026-03-03', 1),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.transactionsPerActiveDay).toBe(1);
  });

  it('returns fractional average when uneven', () => {
    const txs = [
      ...txsOnDay('2026-03-01', 7),
      ...txsOnDay('2026-03-02', 1),
    ];
    const s = analyzeActivity(makeActivity(txs, makeRange()));
    expect(s.transactionsPerActiveDay).toBe(4);
  });
});