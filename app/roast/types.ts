import type { BehaviorScores } from '@/app/analysis/behavior';
import type { ActivityStats } from '@/app/analysis/activity';
import type { ContractStats } from '@/app/analysis/contracts';
import type { TimingStats } from '@/app/analysis/timing';
import type { Address, Range } from '@/app/core/models';

/**
 * Everything the roast layer is allowed to know.
 * Only verified stats. No raw provider responses. No PII.
 */
export type RoastInput = {
  walletShort: string;      // e.g. "0x1234...5678"
  range: Range;
  activity: ActivityStats;
  contracts: ContractStats;
  timing: TimingStats;
  behavior: BehaviorScores;
  identity: {
    name: string;
    score: number;
    traits: string[];
  };
};

export type RoastSource = 'gemini' | 'fallback';

export type Roast = {
  lines: string[];          // 1..5 lines
  source: RoastSource;
  /** Present when source === 'fallback' AND the AI path was attempted. */
  fallbackReason?: string;
};