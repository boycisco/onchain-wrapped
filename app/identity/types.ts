import type { BehaviorScores } from '@/app/analysis/behavior';

export type Trait = string;

export type RuleRole = 'prefix' | 'core';

export type Rule = {
  /** Stable identifier, e.g. "night_owl". Used for tests and for match reporting. */
  id: string;
  /** Human name without "THE", e.g. "NIGHT OWL". */
  name: string;
  /** Short lowercase phrase describing what was matched. */
  trait: Trait;
  /** 0-100, higher = more likely to be chosen over other matches. */
  weight: number;
  role: RuleRole;
  /** Pure predicate over behavior scores. */
  matches: (s: BehaviorScores) => boolean;
};

export type Identity = {
  /** e.g. "THE NIGHT OWL DEGEN" */
  name: string;
  /** 0-100. Internal profile-strength score. NOT a percentile. */
  score: number;
  /**
   * Always null in V1.
   * Rarity requires a population dataset we do not have.
   * We never fabricate a percentile.
   */
  rarity: null;
  /** Traits of the rules that matched, in match order. */
  traits: Trait[];
  /** IDs of the rules that matched (useful for tests / debugging). */
  matchedRuleIds: string[];
};