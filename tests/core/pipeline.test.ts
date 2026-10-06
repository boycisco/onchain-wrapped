import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runPipeline } from '@/app/core/pipeline';
import { setIndexerForTesting, type Indexer } from '@/app/data/indexer';
import type { Address, Transfer } from '@/app/core/models';
import { WALLET } from '../fixtures/build';

/* ---------- fixture transfers ---------- */

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;

function isoAt(date: string, hour = 12, minute = 0): number {
  return Math.floor(
    Date.parse(
      `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
    ) / 1000,
  );
}

function transfer(partial: Partial<Transfer> & { hash: string; timestamp: number }): Transfer {
  return {
    uniqueId: `${partial.hash}:x`,
    from: WALLET,
    to: '0x000000000000000000000000000000000000cafe' as Address,
    blockNumber: BigInt(Math.floor(partial.timestamp / 12)),
    value: 1n,
    asset: 'ETH',
    contractAddress: null,
    decimals: 18,
    category: 'external',
    direction: 'out',
    ...partial,
  };
}

const FIXTURE: Transfer[] = [
  // 3 outgoing ETH to one contract, at night
  transfer({ hash: '0xaaa1', timestamp: isoAt('2026-03-01', 22) }),
  transfer({ hash: '0xaaa2', timestamp: isoAt('2026-03-02', 23) }),
  transfer({ hash: '0xaaa3', timestamp: isoAt('2026-03-03', 1) }),
  // 1 incoming ETH from another address
  transfer({
    hash: '0xbbb1',
    timestamp: isoAt('2026-03-04', 14),
    direction: 'in',
    from: '0x000000000000000000000000000000000000beef' as Address,
    to: WALLET,
  }),
  // 1 incoming USDC
  transfer({
    hash: '0xccc1',
    timestamp: isoAt('2026-03-05', 12),
    direction: 'in',
    from: '0x000000000000000000000000000000000000feed' as Address,
    to: WALLET,
    value: 42_500_000n,
    asset: 'USDC',
    contractAddress: USDC,
    decimals: 6,
    category: 'erc20',
  }),
  // 1 outgoing USDC to a different contract
  transfer({
    hash: '0xddd1',
    timestamp: isoAt('2026-03-06', 23),
    value: 10_000_000n,
    asset: 'USDC',
    contractAddress: USDC,
    decimals: 6,
    category: 'erc20',
    to: '0x000000000000000000000000000000000000f00d' as Address,
  }),
];

/* ---------- tests ---------- */

const FIXED_NOW = new Date('2026-08-15T00:00:00Z');

describe('runPipeline - end to end', () => {
  let mockIndexer: Indexer;

  beforeEach(() => {
    mockIndexer = {
      transfers: async () => FIXTURE,
    };
    setIndexerForTesting(mockIndexer);
  });

  afterEach(() => {
    setIndexerForTesting(null);
  });

  it('produces a complete Wrapped object', async () => {
    const { wrapped } = await runPipeline(WALLET, 'year', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
    });

    expect(wrapped.schemaVersion).toBe(1);
    expect(wrapped.wallet).toBe(WALLET);
    expect(wrapped.range.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(wrapped.range.end.toISOString()).toBe(FIXED_NOW.toISOString());
    expect(wrapped.generatedAt).toBe(FIXED_NOW.toISOString());

    // stats
    expect(wrapped.stats.activity.totalTransactions).toBe(6);
    expect(wrapped.stats.activity.activeDays).toBe(6);
    expect(wrapped.stats.contracts.uniqueAddresses).toBeGreaterThan(0);
    expect(wrapped.stats.timing.total).toBe(6);

    // money
    expect(wrapped.money.usdValuation).toBe('unavailable');
    expect(wrapped.money.tokens.length).toBeGreaterThan(0);

    // behavior
    for (const v of Object.values(wrapped.behavior)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }

    // identity
    expect(typeof wrapped.identity.name).toBe('string');
    expect(wrapped.identity.name.startsWith('THE ')).toBe(true);
    expect(wrapped.identity.rarity).toBeNull();
    expect(wrapped.identity.score).toBeGreaterThanOrEqual(0);
    expect(wrapped.identity.score).toBeLessThanOrEqual(100);

    // roast
    expect(wrapped.roast.source).toBe('fallback');
    expect(wrapped.roast.lines.length).toBeGreaterThanOrEqual(1);
    expect(wrapped.roast.lines.length).toBeLessThanOrEqual(5);

    // placeholders
    expect(wrapped.highlights).toEqual([]);
    expect(wrapped.cards).toEqual([]);
  });

  it('reports timings for every stage', async () => {
    const { timings } = await runPipeline(WALLET, 'year', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
    });
    for (const [k, v] of Object.entries(timings)) {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(timings.total).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic for a fixed clock (except timings)', async () => {
    const a = await runPipeline(WALLET, 'year', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
    });
    const b = await runPipeline(WALLET, 'year', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
    });
    // Strip timings and compare everything else.
    expect(a.wrapped).toEqual(b.wrapped);
  });

  it('handles an empty wallet without throwing', async () => {
    setIndexerForTesting({ transfers: async () => [] });
    const { wrapped } = await runPipeline(WALLET, 'year', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
    });
    expect(wrapped.stats.activity.totalTransactions).toBe(0);
    expect(wrapped.identity.name).toBe('THE GHOST');
    expect(wrapped.roast.lines.length).toBeGreaterThanOrEqual(1);
  });

  it('propagates indexer errors', async () => {
    setIndexerForTesting({
      transfers: async () => {
        throw new Error('provider down');
      },
    });
    await expect(
      runPipeline(WALLET, 'year', { now: FIXED_NOW }),
    ).rejects.toThrow('provider down');
  });

  it('honours the range key (last30)', async () => {
    const { wrapped } = await runPipeline(WALLET, 'last30', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
    });
    const spanMs = wrapped.range.end.getTime() - wrapped.range.start.getTime();
    expect(spanMs).toBe(30 * 86_400_000);
  });
});