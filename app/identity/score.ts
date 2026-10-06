import type { BehaviorScores } from '@/app/analysis/behavior';
import {
  RULES,
  DEFAULT_IDENTITY_NAME,
  DEFAULT_IDENTITY_TRAIT,
  SUPPRESS_PREFIX_IF_CORE_IN,
} from './rules';
import type { Identity, Rule } from './types';

/**
 * Compute the 0-100 internal profile-strength score from behavior scores.
 * Documented formula:
 *
 *   score = round(100 * (
 *       0.30 * activity
 *     + 0.20 * exploration
 *     + 0.20 * consistency
 *     + 0.15 * loyalty
 *     + 0.15 * timing
 *   ))
 *
 * This is NOT a percentile. It is an internal measure we can later
 * compare against a real population if/when one exists.
 */
export function computeIdentityScore(scores: BehaviorScores): number {
  const blended =
    0.30 * scores.activity +
    0.20 * scores.exploration +
    0.20 * scores.consistency +
    0.15 * scores.loyalty +
    0.15 * scores.timing;
  return Math.max(0, Math.min(100, Math.round(blended * 100)));
}

/**
 * Evaluate every rule in `RULES` against the behavior scores.
 * Returned in the original rule-table order so downstream is deterministic.
 */
export function matchingRules(scores: BehaviorScores): Rule[] {
  return RULES.filter((r) => r.matches(scores));
}

/** Pick the highest-weight rule from a list; ties resolved by original order. */
function pickTop(rules: Rule[], role: 'prefix' | 'core' | 'any'): Rule | null {
  const pool = role === 'any' ? rules : rules.filter((r) => r.role === role);
  if (pool.length === 0) return null;
  let best = pool[0]!;
  for (let i = 1; i < pool.length; i++) {
    if (pool[i]!.weight > best.weight) best = pool[i]!;
  }
  return best;
}

export function classify(scores: BehaviorScores): Identity {
  const matches = matchingRules(scores);
  const matchedRuleIds = matches.map((m) => m.id);
  const traits = matches.map((m) => m.trait);

  const core = pickTop(matches, 'core');
  const prefix = pickTop(matches, 'prefix');

  let name: string;
  if (core === null) {
    name = `THE ${DEFAULT_IDENTITY_NAME}`;
    traits.push(DEFAULT_IDENTITY_TRAIT);
  } else if (
    prefix !== null &&
    prefix.id !== core.id &&
    !SUPPRESS_PREFIX_IF_CORE_IN.has(core.id)
  ) {
    name = `THE ${prefix.name} ${core.name}`;
  } else {
    name = `THE ${core.name}`;
  }

  return {
    name,
    score: computeIdentityScore(scores),
    rarity: null,
    traits,
    matchedRuleIds,
  };
}