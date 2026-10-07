import { describe, it, expect } from 'vitest';
import { compare } from '@/app/analysis/compare';
import type { Wrapped } from '@/app/core/wrapped';

function makeWrapped(overrides: Partial<Wrapped> = {}): Wrapped {
  return {
    schemaVersion: 1,
    wallet: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    range: {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-08-15T00:00:00.000Z',
    },
    stats: {
      activity: {
        totalTransactions: 100,
        successfulTransactions: 0,
        failedTransactions: 0,
        unknownTransactions: 100,
        activeDays: 20,
        inactiveDays: 5,
        spanDays: 25,
        firstActivity: null,
        lastActivity: null,
        longestActiveStreak: 5,
        longestInactiveStreak: 2,
        transactionsPerActiveDay: 5,
        busiestDay: null,
        busiestMonth: null,
      },
      contracts: {
        uniqueAddresses: 10,
        topAddresses: [],
        concentration: 0,
        topTenConcentration: 0,
        firstInteractedAddress: null,
        sentTransactions: 50,
      },
      timing: {
        total: 100,
        byHour: [],
        byDayOfWeek: [],
        byMonth: [],
        busiestHour: null,
        busiestDayOfWeek: null,
        busiestMonth: null,
        day: { key: 'day', count: 50, fraction: 0.5 },
        night: { key: 'night', count: 50, fraction: 0.5 },
        lateNight: { key: 'late', count: 20, fraction: 0.2 },
        weekday: { key: 'weekday', count: 70, fraction: 0.7 },
        weekend: { key: 'weekend', count: 30, fraction: 0.3 },
      },
    },
    money: {
      native: {
        sent: '1000',
        received: '0',
        net: '1000',
        sentCount: 1,
        receivedCount: 0,
        largestOut: '1000',
        largestIn: null,
        largestOverall: '1000',
      },
      tokens: [],
      mostUsedStablecoin: null,
      mostUsedToken: null,
      totalTransfers: 1,
      usdValuation: 'unavailable',
    },
    behavior: {
      activity: 0,
      exploration: 0,
      consistency: 0,
      loyalty: 0,
      timing: 0,
    },
    identity: {
      name: 'THE GHOST',
      score: 0,
      rarity: null,
      traits: [],
      matchedRuleIds: [],
    },
    roast: { lines: ['x'], source: 'fallback' },
    highlights: [],
    cards: [],
    generatedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('compare - overall', () => {
  it('declares A the overall winner when A wins more categories', () => {
    const a = makeWrapped({
      stats: {
        ...makeWrapped().stats,
        activity: {
          ...makeWrapped().stats.activity,
          totalTransactions: 500,
          activeDays: 40,
        },
      },
    });
    const b = makeWrapped({
      wallet: '0x2222222222222222222222222222222222222222',
    });
    const r = compare(a, b);
    expect(r.aWins).toBeGreaterThan(r.bWins);
    expect(r.overall).toBe('A');
    expect(r.summary[0]).toMatch(/wins the head-to-head/i);
  });

  it('reports a tie when wins are equal', () => {
    const a = makeWrapped();
    const b = makeWrapped({ wallet: '0x2222222222222222222222222222222222222222' });
    const r = compare(a, b);
    expect(r.overall).toBe('tie');
    expect(r.aWins).toBe(0);
    expect(r.bWins).toBe(0);
    expect(r.ties).toBeGreaterThan(0);
    expect(r.summary[0]).toMatch(/evenly matched/i);
  });
});

describe('compare - categories', () => {
  it('produces one entry per category', () => {
    const r = compare(makeWrapped(), makeWrapped({ wallet: '0x2222222222222222222222222222222222222222' }));
    const ids = r.categories.map((c) => c.id);
    expect(ids).toEqual([
      'transactions',
      'activeDays',
      'uniqueAddresses',
      'activeStreak',
      'nightFraction',
      'nativeSent',
    ]);
  });

  it('every category has numeric aValue/bValue and a winner', () => {
    const r = compare(makeWrapped(), makeWrapped({ wallet: '0x2222222222222222222222222222222222222222' }));
    for (const c of r.categories) {
      expect(typeof c.aValue).toBe('number');
      expect(typeof c.bValue).toBe('number');
      expect(['A', 'B', 'tie']).toContain(c.winner);
      expect(c.difference).toBeGreaterThanOrEqual(0);
    }
  });

  it('picks B when B has more transactions', () => {
    const a = makeWrapped();
    const b = makeWrapped({
      wallet: '0x2222222222222222222222222222222222222222',
      stats: {
        ...makeWrapped().stats,
        activity: { ...makeWrapped().stats.activity, totalTransactions: 999 },
      },
    });
    const c = compare(a, b).categories.find((x) => x.id === 'transactions')!;
    expect(c.winner).toBe('B');
    expect(c.difference).toBe(899);
  });

  it('compares native sent as a bigint, not a string', () => {
    const a = makeWrapped(); // sent = 1000
    const b = makeWrapped({
      wallet: '0x2222222222222222222222222222222222222222',
      money: {
        ...makeWrapped().money,
        native: { ...makeWrapped().money.native, sent: '2000' },
      },
    });
    const c = compare(a, b).categories.find((x) => x.id === 'nativeSent')!;
    expect(c.winner).toBe('B');
    expect(c.aValue).toBe(1000);
    expect(c.bValue).toBe(2000);
  });

  it('computes ratio as larger/smaller when smaller > 0', () => {
    const a = makeWrapped();
    const b = makeWrapped({
      wallet: '0x2222222222222222222222222222222222222222',
      stats: {
        ...makeWrapped().stats,
        activity: { ...makeWrapped().stats.activity, totalTransactions: 300 },
      },
    });
    const c = compare(a, b).categories.find((x) => x.id === 'transactions')!;
    expect(c.ratio).toBe(3);
  });

  it('reports ratio as null when either side is zero', () => {
    const a = makeWrapped();
    const b = makeWrapped({
      wallet: '0x2222222222222222222222222222222222222222',
      stats: {
        ...makeWrapped().stats,
        activity: { ...makeWrapped().stats.activity, totalTransactions: 0 },
      },
    });
    const c = compare(a, b).categories.find((x) => x.id === 'transactions')!;
    expect(c.ratio).toBeNull();
    expect(c.winner).toBe('A');
  });
});

describe('compare - determinism', () => {
  it('same input -> same output', () => {
    const a = makeWrapped();
    const b = makeWrapped({ wallet: '0x2222222222222222222222222222222222222222' });
    expect(compare(a, b)).toEqual(compare(a, b));
  });

  it('does not mutate the input Wrapped objects', () => {
    const a = makeWrapped();
    const b = makeWrapped({ wallet: '0x2222222222222222222222222222222222222222' });
    const aCopy = JSON.parse(JSON.stringify(a));
    const bCopy = JSON.parse(JSON.stringify(b));
    compare(a, b);
    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });
});