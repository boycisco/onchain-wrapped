import type { Rule } from './types';

/**
 * Identity rule table. Every threshold lives here so it can be audited,
 * tuned, and tested in one place.
 *
 * `matches` receives the five behavior scores, all in [0, 1]:
 *   activity, exploration, consistency, loyalty, timing
 * where higher "timing" means more NIGHT activity.
 */

export const DEFAULT_IDENTITY_NAME = 'MYSTERY';
export const DEFAULT_IDENTITY_TRAIT = 'no strong pattern detected';

export const RULES: Rule[] = [
  /* -------- core rules -------- */

  {
    id: 'ghost',
    name: 'GHOST',
    trait: 'barely active',
    weight: 10,
    role: 'core',
    matches: (s) => s.activity < 0.15,
  },
  {
    id: 'tourist',
    name: 'TOURIST',
    trait: 'occasional visitor',
    weight: 20,
    role: 'core',
    matches: (s) => s.activity >= 0.15 && s.activity < 0.35,
  },
  {
    id: 'degen',
    name: 'DEGEN',
    trait: 'high activity, bursty pattern',
    weight: 80,
    role: 'core',
    matches: (s) => s.activity >= 0.55 && s.consistency < 0.55,
  },
  {
    id: 'grinder',
    name: 'GRINDER',
    trait: 'high activity, consistent pattern',
    weight: 70,
    role: 'core',
    matches: (s) => s.activity >= 0.55 && s.consistency >= 0.55,
  },
  {
    id: 'hodler',
    name: 'HODLER',
    trait: 'few moves, concentrated wallet',
    weight: 60,
    role: 'core',
    matches: (s) => s.loyalty >= 0.75 && s.activity <= 0.35,
  },
  {
    id: 'loyalist',
    name: 'LOYALIST',
    trait: 'returns to the same addresses',
    weight: 50,
    role: 'core',
    matches: (s) => s.loyalty >= 0.65 && s.activity > 0.35,
  },
  {
    id: 'explorer',
    name: 'EXPLORER',
    trait: 'wide address reach',
    weight: 55,
    role: 'core',
    matches: (s) => s.exploration >= 0.65,
  },

  /* -------- prefix rules -------- */

  {
    id: 'night_owl',
    name: 'NIGHT OWL',
    trait: 'high night activity',
    weight: 40,
    role: 'prefix',
    matches: (s) => s.timing >= 0.60,
  },
  {
    id: 'daywalker',
    name: 'DAYWALKER',
    trait: 'mostly daytime activity',
    weight: 35,
    role: 'prefix',
    matches: (s) => s.timing <= 0.15 && s.activity >= 0.20,
  },
  {
    id: 'veteran',
    name: 'VETERAN',
    trait: 'long-running consistent pattern',
    weight: 45,
    role: 'prefix',
    matches: (s) => s.consistency >= 0.65,
  },
];

/** Cores whose presence suppresses any prefix (low activity wallets). */
export const SUPPRESS_PREFIX_IF_CORE_IN: ReadonlySet<string> = new Set([
  'ghost',
  'tourist',
]);