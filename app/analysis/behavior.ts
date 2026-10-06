import type { ActivityStats } from './activity';
import type { MoneyStats } from './money';
import type { ContractStats } from './contracts';
import type { TimingStats } from './timing';

/**
 * Behavioral scoring.
 *
 * All five scores are in [0, 1]. Higher means "more of that thing".
 * Every formula is a pure function of already-computed analysis stats.
 * No provider access, no I/O, no randomness.
 *
 * "timing" is defined as NIGHT-OWL-NESS: a high score means the wallet does
 * most of its work at night / late-night. The identity layer translates that
 * into a human label (e.g. THE NIGHT OWL).
 */

/* ------------------------------------------------------------------ */
/* Saturating constants. Centralized so they can be audited/tuned.    */
/* ------------------------------------------------------------------ */

export const SATURATION = {
  activityTx: 500,            // log10 scale saturates here
  activityStreak: 30,         // streak in days that yields full points
  explorationAddresses: 100,  // log10 scale saturates here
  explorationTokens: 20,      // distinct ERC-20 tokens that yield full points
  consistencyStreak: 60,      // streak in days that yields full streak points
} as const;

export type BehaviorInput = {
  activity: ActivityStats;
  money: MoneyStats;
  contracts: ContractStats;
  timing: TimingStats;
};

export type BehaviorScores = {
  activity: number;
  exploration: number;
  consistency: number;
  loyalty: number;
  timing: number;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round4(n: number): number {
  return Number(clamp01(n).toFixed(4));
}

/**
 * Logarithmic saturation. Returns 0 at value=0, 1 at value>=saturation.
 * Uses log10(1 + value) / log10(1 + saturation) so 0 and small values stay small.
 */
function logScale(value: number, saturation: number): number {
  if (value <= 0) return 0;
  if (value >= saturation) return 1;
  return Math.log10(1 + value) / Math.log10(1 + saturation);
}

/** Safe division. Returns 0 when the denominator is 0. */
function safeDiv(num: number, den: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
  return num / den;
}

/* ------------------------------------------------------------------ */
/* Component scores                                                    */
/* ------------------------------------------------------------------ */

function scoreActivity(a: ActivityStats): number {
  const txComponent = logScale(a.totalTransactions, SATURATION.activityTx);
  const coverage = safeDiv(a.activeDays, Math.max(1, a.spanDays));
  const streakComponent = clamp01(safeDiv(a.longestActiveStreak, SATURATION.activityStreak));
  return round4(0.5 * txComponent + 0.3 * coverage + 0.2 * streakComponent);
}

function scoreExploration(c: ContractStats, m: MoneyStats): number {
  const addressComponent = logScale(c.uniqueAddresses, SATURATION.explorationAddresses);
  const diversity = safeDiv(c.uniqueAddresses, Math.max(1, c.sentTransactions));
  const tokenComponent = clamp01(safeDiv(m.tokens.length, SATURATION.explorationTokens));
  return round4(0.5 * addressComponent + 0.3 * diversity + 0.2 * tokenComponent);
}

function scoreConsistency(a: ActivityStats): number {
  const coverage = safeDiv(a.activeDays, Math.max(1, a.spanDays));
  const streakComponent = clamp01(safeDiv(a.longestActiveStreak, SATURATION.consistencyStreak));
  return round4(0.7 * coverage + 0.3 * streakComponent);
}

function scoreLoyalty(c: ContractStats): number {
  const top1 = clamp01(c.concentration);
  const top10 = clamp01(c.topTenConcentration);
  return round4(0.5 * top1 + 0.5 * top10);
}

function scoreTiming(t: TimingStats): number {
  const night = clamp01(t.night.fraction);
  const late = clamp01(t.lateNight.fraction);
  return round4(0.5 * night + 0.5 * late);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function analyzeBehavior(input: BehaviorInput): BehaviorScores {
  return {
    activity: scoreActivity(input.activity),
    exploration: scoreExploration(input.contracts, input.money),
    consistency: scoreConsistency(input.activity),
    loyalty: scoreLoyalty(input.contracts),
    timing: scoreTiming(input.timing),
  };
}