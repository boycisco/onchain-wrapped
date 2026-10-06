import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runPipeline, buildCacheKey, CACHE_TTL_MS } from '@/app/core/pipeline';
import { setIndexerForTesting, type Indexer } from '@/app/data/indexer';
import { InMemoryCache, setCacheForTesting, getCache } from '@/app/core/cache';
import type { Address, Transfer } from '@/app/core/models';
import { WALLET } from '../fixtures/build';

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
  transfer({ hash: '0xaaa1', timestamp: isoAt('2026-03-01', 22) }),
  transfer({ hash: '0xaaa2', timestamp: isoAt('2026-03-02', 23) }),
  transfer({ hash: '0xaaa3', timestamp: isoAt('2026-03-03', 1) }),
  transfer({
    hash: '0xbbb1',
    timestamp: isoAt('2026-03-04', 14),
    direction: 'in',
    from: '0x000000000000000000000000000000000000beef' as Address,
    to: WALLET,
  }),
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

const FIXED_NOW = new Date('2026-08-15T00:00:00Z');

describe('runPipeline - end to end', () => {
  let mockIndexer: Indexer;

  beforeEach(() => {
    mockIndexer = { transfers: async () => FIXTURE };
    setIndexerForTesting(mockIndexer);
    setCacheForTesting(null);
  });

  afterEach(() => {
    setIndexerForTesting(null);
    setCacheForTesting(null);
  });

  it('produces a complete Wrapped object', async () => {
    const { wrapped } = await runPipeline(WALLET, 'year', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
    });

    expect(wrapped.schemaVersion).toBe(1);
    expect(wrapped.wallet).toBe(WALLET);
    expect(wrapped.range.start).toBe('2026-01-01T00:00:00.000Z');
    expect(wrapped.range.end).toBe(FIXED_NOW.toISOString());
    expect(wrapped.generatedAt).toBe(FIXED_NOW.toISOString());

    expect(wrapped.stats.activity.totalTransactions).toBe(6);
    expect(wrapped.stats.activity.activeDays).toBe(6);
    expect(wrapped.stats.contracts.uniqueAddresses).toBeGreaterThan(0);
    expect(wrapped.stats.timing.total).toBe(6);

    expect(wrapped.money.usdValuation).toBe('unavailable');
    expect(wrapped.money.tokens.length).toBeGreaterThan(0);

    for (const v of Object.values(wrapped.behavior)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }

    expect(typeof wrapped.identity.name).toBe('string');
    expect(wrapped.identity.name.startsWith('THE ')).toBe(true);
    expect(wrapped.identity.rarity).toBeNull();
    expect(wrapped.identity.score).toBeGreaterThanOrEqual(0);
    expect(wrapped.identity.score).toBeLessThanOrEqual(100);

    expect(wrapped.roast.source).toBe('fallback');
    expect(wrapped.roast.lines.length).toBeGreaterThanOrEqual(1);
    expect(wrapped.roast.lines.length).toBeLessThanOrEqual(5);

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
      skipCache: true,
    });
    const b = await runPipeline(WALLET, 'year', {
      now: FIXED_NOW,
      roast: { forceFallback: true },
      skipCache: true,
    });
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
    const spanMs =
      Date.parse(wrapped.range.end) - Date.parse(wrapped.range.start);
    expect(spanMs).toBe(30 * 86_400_000);
  });
});

describe('runPipeline - cache', () => {
  beforeEach(() => {
    setCacheForTesting(null);
  });
  afterEach(() => {
    setIndexerForTesting(null);
    setCacheForTesting(null);
  });

  it('serves the second call from cache', async () => {
    const transfers = vi.fn(async () => FIXTURE);
    setIndexerForTesting({ transfers });

    const opts = { now: FIXED_NOW, roast: { forceFallback: true } } as const;
    const a = await runPipeline(WALLET, 'year', opts);
    const b = await runPipeline(WALLET, 'year', opts);

    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(b.wrapped).toEqual(a.wrapped);
    expect(transfers).toHaveBeenCalledTimes(1);
  });

  it('caches per (range, wallet) pair', async () => {
    setIndexerForTesting({ transfers: async () => FIXTURE });
    const opts = { now: FIXED_NOW, roast: { forceFallback: true } } as const;

    await runPipeline(WALLET, 'year', opts);
    await runPipeline(WALLET, 'last30', opts);
    await runPipeline(WALLET, 'last90', opts);

    const cache = getCache() as InMemoryCache;
    expect(cache.size()).toBe(3);
  });

  it('respects the TTL', async () => {
    let t = 1_000_000;
    const clocked = new InMemoryCache(() => t);
    setCacheForTesting(clocked);
    setIndexerForTesting({ transfers: async () => FIXTURE });

    const opts = { now: FIXED_NOW, roast: { forceFallback: true } } as const;

    const a = await runPipeline(WALLET, 'year', opts);
    expect(a.cached).toBe(false);

    t += CACHE_TTL_MS - 1;
    const b = await runPipeline(WALLET, 'year', opts);
    expect(b.cached).toBe(true);

    t += 2;
    const c = await runPipeline(WALLET, 'year', opts);
    expect(c.cached).toBe(false);
  });

  it('skipCache bypasses both read and write', async () => {
    const transfers = vi.fn(async () => FIXTURE);
    setIndexerForTesting({ transfers });

    const opts = {
      now: FIXED_NOW,
      roast: { forceFallback: true },
      skipCache: true,
    } as const;

    const a = await runPipeline(WALLET, 'year', opts);
    const b = await runPipeline(WALLET, 'year', opts);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(false);
    expect(transfers).toHaveBeenCalledTimes(2);

    const cache = getCache() as InMemoryCache;
    expect(cache.size()).toBe(0);
  });
});

describe('buildCacheKey', () => {
  it('includes chain, version, range key, and lowercased wallet', () => {
    const k = buildCacheKey('year', '0xAbCdEf');
    expect(k).toBe('wrapped:base:v1:year:0xabcdef');
  });
});