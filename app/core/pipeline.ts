import type { Address, Activity, Range } from './models';
import { rangeFor, type RangeKey } from './range';
import { composeWrapped, type Wrapped } from './wrapped';

import { getIndexer } from '@/app/data/indexer';
import { groupTransactions } from '@/app/data/normalize';

import { analyzeActivity } from '@/app/analysis/activity';
import { analyzeMoney } from '@/app/analysis/money';
import { analyzeContracts } from '@/app/analysis/contracts';
import { analyzeTiming } from '@/app/analysis/timing';
import { analyzeBehavior } from '@/app/analysis/behavior';

import { classify } from '@/app/identity/score';
import { generateRoast, type GenerateOptions } from '@/app/roast/generator';

export type PipelineOptions = {
  /** Clock used for range computation and generatedAt. */
  now?: Date;
  /** Roast overrides (used by tests and by ops to force the fallback). */
  roast?: Pick<GenerateOptions, 'callModel' | 'forceFallback'>;
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
};

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Run the full pipeline for one wallet and range.
 *
 *   wallet -> fetch -> normalize -> analyze -> identity -> roast -> compose -> Wrapped
 *
 * Normalization is fused into the indexer by design (provider -> internal
 * models happens before data leaves app/data). So "fetch" here measures
 * network + normalize together.
 */
export async function runPipeline(
  wallet: Address,
  rangeKey: RangeKey,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const t0 = Date.now();
  const now = options.now ?? new Date();
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
    options.roast ?? {},
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

  return {
    wrapped,
    timings: {
      fetch,
      analyze,
      identity: identityMs,
      roast: roastMs,
      total,
    },
  };
}