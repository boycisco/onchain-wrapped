import type { Address, Activity, Range } from './models';
import { rangeFor, type RangeKey } from './range';
import { composeWrapped, type Wrapped } from './wrapped';
import { getCache, type Cache } from './cache';

import { getIndexer } from '@/app/data/indexer';
import { groupTransactions } from '@/app/data/normalize';

import { analyzeActivity } from '@/app/analysis/activity';
import { analyzeMoney } from '@/app/analysis/money';
import { analyzeContracts } from '@/app/analysis/contracts';
import { analyzeTiming } from '@/app/analysis/timing';
import { analyzeBehavior } from '@/app/analysis/behavior';

import { classify } from '@/app/identity/score';
import { generateRoast, type GenerateOptions } from '@/app/roast/generator';

/** Cache TTL for a fully-composed Wrapped. Short enough to stay fresh. */
export const CACHE_TTL_MS = 5 * 60 * 1000;

export type PipelineOptions = {
  /** Clock used for range computation and generatedAt. */
  now?: Date;
  /** Roast overrides (used by tests and by ops to force the fallback). */
  roast?: Pick<GenerateOptions, 'callModel' | 'forceFallback'>;
  /** Override the cache implementation (used by tests). */
  cache?: Cache;
  /** Bypass the cache entirely (both read and write). */
  skipCache?: boolean;
};

export type PipelineTimings = {
  fetch: number;
  analyze: number;
  identity: number;
  roast: number;
  total: number;
};

export type PipelineResult = {
  wrapped: Wrapped;
  timings: PipelineTimings;
  /** True when the result came from cache. Timings reflect the original run. */
  cached: boolean;
};

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Cache key shape: wrapped:<chain>:<schema-version>:<rangeKey>:<wallet>
 * Chain and schema version are pinned so a future algorithm change cannot
 * silently serve stale results. Wallet is lowercased to avoid two keys for
 * the same checksummed address.
 */
export function buildCacheKey(rangeKey: RangeKey, wallet: string): string {
  return `wrapped:base:v1:${rangeKey}:${wallet.toLowerCase()}`;
}

export async function runPipeline(
  wallet: Address,
  rangeKey: RangeKey,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const now = options.now ?? new Date();
  const cacheClient = options.cache ?? getCache();
  const key = buildCacheKey(rangeKey, wallet);

  if (!options.skipCache) {
    const hit = await cacheClient.get<PipelineResult>(key);
    if (hit) {
      return { ...hit, cached: true };
    }
  }

  const t0 = Date.now();
  const range: Range = rangeFor(rangeKey, now);

  /* ---------- fetch (network + normalize) ---------- */
  const tFetch = Date.now();
  const indexer = await getIndexer();
  const transfers = await indexer.transfers(wallet, range);
  const fetch = Date.now() - tFetch;

  /* ---------- analyze ---------- */
  const tAnalyze = Date.now();
  const transactions = groupTransactions(transfers);
  const activity: Activity = { wallet, range, transfers, transactions };

  const activityStats = analyzeActivity(activity);
  const moneyStats = analyzeMoney(activity);
  const contractStats = analyzeContracts(activity);
  const timingStats = analyzeTiming(activity);
  const behavior = analyzeBehavior({
    activity: activityStats,
    money: moneyStats,
    contracts: contractStats,
    timing: timingStats,
  });
  const analyze = Date.now() - tAnalyze;

  /* ---------- identity ---------- */
  const tIdentity = Date.now();
  const identity = classify(behavior);
  const identityMs = Date.now() - tIdentity;

  /* ---------- roast ---------- */
  const tRoast = Date.now();
  const forceFallback =
    (options.roast?.forceFallback ?? false) ||
    process.env.FORCE_ROAST_FALLBACK === '1';
  const roast = await generateRoast(
    {
      walletShort: shorten(wallet),
      range,
      activity: activityStats,
      contracts: contractStats,
      timing: timingStats,
      behavior,
      identity: {
        name: identity.name,
        score: identity.score,
        traits: identity.traits,
      },
    },
    { ...(options.roast ?? {}), forceFallback },
  );
  const roastMs = Date.now() - tRoast;

  /* ---------- compose ---------- */
  const wrapped = composeWrapped({
    wallet,
    range,
    activity: activityStats,
    money: moneyStats,
    contracts: contractStats,
    timing: timingStats,
    behavior,
    identity,
    roast,
    generatedAt: now,
  });

  const total = Date.now() - t0;

  const result: PipelineResult = {
    wrapped,
    timings: {
      fetch,
      analyze,
      identity: identityMs,
      roast: roastMs,
      total,
    },
    cached: false,
  };

  if (!options.skipCache) {
    await cacheClient.set(key, result, CACHE_TTL_MS);
  }

  return result;
}