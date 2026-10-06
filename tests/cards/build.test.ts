import { describe, it, expect } from 'vitest';
import { buildCards } from '@/app/cards/build';
import type { Wrapped } from '@/app/core/wrapped';

function makeWrapped(overrides: Partial<Wrapped> = {}): Wrapped {
  return {
    schemaVersion: 1,
    wallet: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    range: {
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-08-15T00:00:00.000Z',
    },
    stats: {
      activity: {
        totalTransactions: 42,
        successfulTransactions: 0,
        failedTransactions: 0,
        unknownTransactions: 42,
        activeDays: 12,
        inactiveDays: 3,
        spanDays: 15,
        firstActivity: '2026-03-01T12:00:00.000Z',
        lastActivity: '2026-03-15T12:00:00.000Z',
        longestActiveStreak: 5,
        longestInactiveStreak: 2,
        transactionsPerActiveDay: 3.5,
        busiestDay: { date: '2026-03-10', count: 8 },
        busiestMonth: { month: '2026-03', count: 42 },
      },
      contracts: {
        uniqueAddresses: 5,
        topAddresses: [
          { address: '0x1111111111111111111111111111111111111111', interactions: 10 },
          { address: '0x2222222222222222222222222222222222222222', interactions: 6 },
        ],
        concentration: 0.5,
        topTenConcentration: 1,
        firstInteractedAddress: '0x1111111111111111111111111111111111111111',
        sentTransactions: 20,
      },
      timing: {
        total: 42,
        byHour: [],
        byDayOfWeek: [],
        byMonth: [],
        busiestHour: { key: 23, count: 10, fraction: 0.2381 },
        busiestDayOfWeek: { key: 6, count: 12, fraction: 0.2857 },
        busiestMonth: { key: 2, count: 42, fraction: 1 },
        day: { key: 'day', count: 15, fraction: 0.3571 },
        night: { key: 'night', count: 27, fraction: 0.6429 },
        lateNight: { key: 'late', count: 14, fraction: 0.3333 },
        weekday: { key: 'weekday', count: 30, fraction: 0.7143 },
        weekend: { key: 'weekend', count: 12, fraction: 0.2857 },
      },
    },
    money: {
      native: {
        sent: '1000',
        received: '500',
        net: '500',
        sentCount: 3,
        receivedCount: 2,
        largestOut: '700',
        largestIn: '400',
        largestOverall: '700',
      },
      tokens: [],
      mostUsedStablecoin: null,
      mostUsedToken: {
        symbol: 'USDC',
        contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        totalIn: '100',
        totalOut: '50',
        totalNet: '50',
        inCount: 2,
        outCount: 1,
        transferCount: 3,
        largestIn: '80',
        largestOut: '50',
      },
      totalTransfers: 10,
      usdValuation: 'unavailable',
    },
    behavior: {
      activity: 0.5,
      exploration: 0.4,
      consistency: 0.3,
      loyalty: 0.6,
      timing: 0.7,
    },
    identity: {
      name: 'THE NIGHT OWL DEGEN',
      score: 62,
      rarity: null,
      traits: ['high night activity', 'high activity, bursty pattern'],
      matchedRuleIds: ['night_owl', 'degen'],
    },
    roast: {
      lines: ['Line one.', 'Line two.'],
      source: 'fallback',
    },
    highlights: [],
    cards: [],
    generatedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildCards', () => {
  it('returns a bounded list of cards in a stable order', () => {
    const cards = buildCards(makeWrapped());
    const ids = cards.map((c) => c.id);
    expect(ids).toEqual(['activity', 'identity', 'timing', 'money', 'addresses', 'roast']);
    expect(cards.length).toBeLessThanOrEqual(10);
  });

  it('every card has an id, type, and title', () => {
    for (const c of buildCards(makeWrapped())) {
      expect(typeof c.id).toBe('string');
      expect(typeof c.type).toBe('string');
      expect(typeof c.title).toBe('string');
      expect(c.title.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for the same input', () => {
    const a = buildCards(makeWrapped());
    const b = buildCards(makeWrapped());
    expect(a).toEqual(b);
  });

  it('activity card carries real values, not rounded fiction', () => {
    const c = buildCards(makeWrapped()).find((x) => x.type === 'activity') as
      | { transactions: number; activeDays: number; busiestDay: unknown }
      | undefined;
    expect(c).toBeDefined();
    expect(c!.transactions).toBe(42);
    expect(c!.activeDays).toBe(12);
    expect(c!.busiestDay).toEqual({ date: '2026-03-10', count: 8 });
  });

  it('identity card carries name, score, traits', () => {
    const c = buildCards(makeWrapped()).find((x) => x.type === 'identity') as
      | { name: string; score: number; traits: string[] }
      | undefined;
    expect(c).toBeDefined();
    expect(c!.name).toBe('THE NIGHT OWL DEGEN');
    expect(c!.score).toBe(62);
    expect(c!.traits).toEqual([
      'high night activity',
      'high activity, bursty pattern',
    ]);
  });

  it('timing card exposes busiest hour/day and night fractions', () => {
    const c = buildCards(makeWrapped()).find((x) => x.type === 'timing') as
      | { busiestHour: number; busiestDayOfWeek: number; nightFraction: number; lateNightFraction: number }
      | undefined;
    expect(c).toBeDefined();
    expect(c!.busiestHour).toBe(23);
    expect(c!.busiestDayOfWeek).toBe(6);
    expect(c!.nightFraction).toBe(0.6429);
    expect(c!.lateNightFraction).toBe(0.3333);
  });

  it('money card carries native sent/received as decimal strings', () => {
    const c = buildCards(makeWrapped()).find((x) => x.type === 'money') as
      | { nativeSent: string; nativeReceived: string; topToken: { symbol: string | null } | null }
      | undefined;
    expect(c).toBeDefined();
    expect(typeof c!.nativeSent).toBe('string');
    expect(typeof c!.nativeReceived).toBe('string');
    expect(c!.topToken?.symbol).toBe('USDC');
  });

  it('skips the addresses card when the wallet touched zero addresses', () => {
    const w = makeWrapped();
    w.stats.contracts.uniqueAddresses = 0;
    w.stats.contracts.topAddresses = [];
    const ids = buildCards(w).map((c) => c.id);
    expect(ids).not.toContain('addresses');
  });

  it('roast card carries the exact lines and nothing more', () => {
    const c = buildCards(makeWrapped()).find((x) => x.type === 'roast') as
      | { lines: string[] }
      | undefined;
    expect(c).toBeDefined();
    expect(c!.lines).toEqual(['Line one.', 'Line two.']);
  });
});