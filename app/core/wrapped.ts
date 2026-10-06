import type { Address, Range } from './models';
import type { ActivityStats } from '@/app/analysis/activity';
import type { MoneyStats } from '@/app/analysis/money';
import type { ContractStats } from '@/app/analysis/contracts';
import type { TimingStats } from '@/app/analysis/timing';
import type { BehaviorScores } from '@/app/analysis/behavior';
import type { Identity } from '@/app/identity/types';
import type { Roast } from '@/app/roast/types';

/**
 * Bumped whenever the Wrapped contract changes in a way that would invalidate
 * cached results or downstream consumers.
 */
export const WRAPPED_SCHEMA_VERSION = 1;

/** Placeholder shape. Filled in by a later highlights pass. */
export type Highlight = { type: string } & Record<string, unknown>;

/** Placeholder shape. Filled in by a later card-spec pass. */
export type Card = { type: string; title: string } & Record<string, unknown>;

export type WrappedStats = {
  activity: ActivityStats;
  contracts: ContractStats;
  timing: TimingStats;
};

export type Wrapped = {
  schemaVersion: number;
  wallet: Address;
  range: Range;
  stats: WrappedStats;
  money: MoneyStats;
  behavior: BehaviorScores;
  identity: Identity;
  roast: Roast;
  highlights: Highlight[];
  cards: Card[];
  generatedAt: string;
};

export type ComposeInput = {
  wallet: Address;
  range: Range;
  activity: ActivityStats;
  money: MoneyStats;
  contracts: ContractStats;
  timing: TimingStats;
  behavior: BehaviorScores;
  identity: Identity;
  roast: Roast;
  highlights?: Highlight[];
  cards?: Card[];
  generatedAt: Date;
};

/**
 * Assemble the canonical Wrapped object from the pipeline outputs.
 * Pure function: everything it needs is passed in.
 */
export function composeWrapped(input: ComposeInput): Wrapped {
  return {
    schemaVersion: WRAPPED_SCHEMA_VERSION,
    wallet: input.wallet,
    range: input.range,
    stats: {
      activity: input.activity,
      contracts: input.contracts,
      timing: input.timing,
    },
    money: input.money,
    behavior: input.behavior,
    identity: input.identity,
    roast: input.roast,
    highlights: input.highlights ?? [],
    cards: input.cards ?? [],
    generatedAt: input.generatedAt.toISOString(),
  };
}