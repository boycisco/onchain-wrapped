import type { Address, Range } from './models';
import type { ActivityStats } from '@/app/analysis/activity';
import type { MoneyStats } from '@/app/analysis/money';
import type { ContractStats } from '@/app/analysis/contracts';
import type { TimingStats } from '@/app/analysis/timing';
import type { BehaviorScores } from '@/app/analysis/behavior';
import type { Identity } from '@/app/identity/types';
import type { Roast } from '@/app/roast/types';

export const WRAPPED_SCHEMA_VERSION = 1;

/** Placeholder shape. Filled in by a later highlights pass. */
export type Highlight = { type: string } & Record<string, unknown>;

/** Placeholder shape. Filled in by a later card-spec pass. */
export type Card = { type: string; title: string } & Record<string, unknown>;

/**
 * The Wrapped is a JSON document, so its date fields are ISO strings, not
 * Date objects. This makes the wire format, the cached format, and the type
 * exactly the same shape. Internal types (Range) keep Date objects.
 */
export type SerializedRange = {
  start: string; // ISO 8601 UTC
  end: string;   // ISO 8601 UTC
};

export type WrappedStats = {
  activity: ActivityStats;
  contracts: ContractStats;
  timing: TimingStats;
};

export type Wrapped = {
  schemaVersion: number;
  wallet: Address;
  range: SerializedRange;
  stats: WrappedStats;
  money: MoneyStats;
  behavior: BehaviorScores;
  identity: Identity;
  roast: Roast;
  highlights: Highlight[];
  cards: Card[];
  generatedAt: string; // ISO 8601 UTC
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

export function composeWrapped(input: ComposeInput): Wrapped {
  return {
    schemaVersion: WRAPPED_SCHEMA_VERSION,
    wallet: input.wallet,
    range: {
      start: input.range.start.toISOString(),
      end: input.range.end.toISOString(),
    },
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