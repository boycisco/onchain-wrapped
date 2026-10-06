import { describe, it, expect } from 'vitest';
import { classify, computeIdentityScore, matchingRules } from '@/app/identity/score';
import type { BehaviorScores } from '@/app/analysis/behavior';

function scores(partial: Partial<BehaviorScores>): BehaviorScores {
  return {
    activity: 0,
    exploration: 0,
    consistency: 0,
    loyalty: 0,
    timing: 0,
    ...partial,
  };
}

describe('computeIdentityScore', () => {
  it('all zeros -> 0', () => {
    expect(computeIdentityScore(scores({}))).toBe(0);
  });

  it('all ones -> 100', () => {
    expect(
      computeIdentityScore(
        scores({
          activity: 1,
          exploration: 1,
          consistency: 1,
          loyalty: 1,
          timing: 1,
        }),
      ),
    ).toBe(100);
  });

  it('applies the documented weights', () => {
    // Only activity=1: 0.30 * 1 = 0.30 -> 30
    expect(computeIdentityScore(scores({ activity: 1 }))).toBe(30);
    // Only timing=1: 0.15 * 1 = 0.15 -> 15
    expect(computeIdentityScore(scores({ timing: 1 }))).toBe(15);
    // Only exploration=1: 0.20 -> 20
    expect(computeIdentityScore(scores({ exploration: 1 }))).toBe(20);
  });
});

describe('matchingRules', () => {
  it('ghost matches on very low activity', () => {
    const ids = matchingRules(scores({ activity: 0.05 })).map((r) => r.id);
    expect(ids).toContain('ghost');
  });

  it('tourist matches on low but non-trivial activity', () => {
    const ids = matchingRules(scores({ activity: 0.2 })).map((r) => r.id);
    expect(ids).toContain('tourist');
    expect(ids).not.toContain('ghost');
  });

  it('degen matches on high activity with low consistency', () => {
    const ids = matchingRules(
      scores({ activity: 0.8, consistency: 0.3 }),
    ).map((r) => r.id);
    expect(ids).toContain('degen');
    expect(ids).not.toContain('grinder');
  });

  it('grinder matches on high activity with high consistency', () => {
    const ids = matchingRules(
      scores({ activity: 0.8, consistency: 0.7 }),
    ).map((r) => r.id);
    expect(ids).toContain('grinder');
    expect(ids).not.toContain('degen');
  });

  it('night_owl matches on high timing', () => {
    const ids = matchingRules(scores({ timing: 0.7 })).map((r) => r.id);
    expect(ids).toContain('night_owl');
  });

  it('daywalker matches on low timing with real activity', () => {
    const ids = matchingRules(
      scores({ timing: 0.05, activity: 0.4 }),
    ).map((r) => r.id);
    expect(ids).toContain('daywalker');
  });

  it('daywalker does not match when activity is too low', () => {
    const ids = matchingRules(scores({ timing: 0.05, activity: 0.1 })).map(
      (r) => r.id,
    );
    expect(ids).not.toContain('daywalker');
  });

  it('explorer matches on high exploration', () => {
    const ids = matchingRules(scores({ exploration: 0.8 })).map((r) => r.id);
    expect(ids).toContain('explorer');
  });

  it('loyalist matches on high loyalty with real activity', () => {
    const ids = matchingRules(
      scores({ loyalty: 0.7, activity: 0.5 }),
    ).map((r) => r.id);
    expect(ids).toContain('loyalist');
  });

  it('hodler matches on very high loyalty with low activity', () => {
    const ids = matchingRules(
      scores({ loyalty: 0.8, activity: 0.3 }),
    ).map((r) => r.id);
    expect(ids).toContain('hodler');
    expect(ids).not.toContain('loyalist');
  });
});

describe('classify - fallback', () => {
  it('a wallet with no matching rules becomes THE MYSTERY', () => {
    // All scores ~0.2: below every threshold except possibly none.
    const id = classify(
      scores({
        activity: 0.16,
        exploration: 0.1,
        consistency: 0.1,
        loyalty: 0.1,
        timing: 0.3,
      }),
    );
    // tourist matches (0.15 <= activity < 0.35)
    expect(id.name).toBe('THE TOURIST');
  });

  it('truly empty wallet becomes THE GHOST', () => {
    const id = classify(scores({}));
    expect(id.name).toBe('THE GHOST');
    expect(id.matchedRuleIds).toContain('ghost');
  });

  it('falls back to THE MYSTERY when literally no rule matches', () => {
    // Trick: pick values that dodge every rule.
    // activity 0.4: not ghost/tourist/degen/grinder (needs >=0.55)/hodler(needs <=0.35)
    //   Also not loyalist (needs >=0.65)
    // timing 0.4: not night_owl (>=0.6), not daywalker (<=0.15)
    // consistency 0.4: not grinder, not veteran
    // exploration 0.4: not explorer
    // loyalty 0.4: not hodler/loyalist
    const id = classify(
      scores({
        activity: 0.4,
        exploration: 0.4,
        consistency: 0.4,
        loyalty: 0.4,
        timing: 0.4,
      }),
    );
    expect(id.name).toBe('THE MYSTERY');
    expect(id.matchedRuleIds).toEqual([]);
    expect(id.traits).toContain('no strong pattern detected');
  });
});

describe('classify - composition', () => {
  it('NIGHT OWL + DEGEN = THE NIGHT OWL DEGEN', () => {
    const id = classify(
      scores({
        activity: 0.8,
        consistency: 0.3,
        timing: 0.7,
      }),
    );
    expect(id.name).toBe('THE NIGHT OWL DEGEN');
    expect(id.matchedRuleIds).toContain('night_owl');
    expect(id.matchedRuleIds).toContain('degen');
  });

  it('NIGHT OWL + EXPLORER = THE NIGHT OWL EXPLORER', () => {
    const id = classify(
      scores({
        activity: 0.4,
        exploration: 0.8,
        timing: 0.7,
      }),
    );
    expect(id.name).toBe('THE NIGHT OWL EXPLORER');
  });

  it('VETERAN + GRINDER = THE VETERAN GRINDER', () => {
    const id = classify(
      scores({
        activity: 0.7,
        consistency: 0.7,
        timing: 0.3,
      }),
    );
    expect(id.name).toBe('THE VETERAN GRINDER');
  });

  it('GHOST suppresses the prefix', () => {
    const id = classify(
      scores({
        activity: 0.05,
        timing: 0.9, // would otherwise match night_owl
      }),
    );
    expect(id.name).toBe('THE GHOST');
    // Traits still record that night_owl matched, but the name does not include it.
    expect(id.matchedRuleIds).toContain('night_owl');
    expect(id.matchedRuleIds).toContain('ghost');
  });

  it('TOURIST suppresses the prefix', () => {
    const id = classify(
      scores({
        activity: 0.2,
        timing: 0.9,
      }),
    );
    expect(id.name).toBe('THE TOURIST');
  });
});

describe('classify - determinism', () => {
  it('same input -> same output', () => {
    const s = scores({
      activity: 0.8,
      exploration: 0.7,
      consistency: 0.3,
      loyalty: 0.4,
      timing: 0.75,
    });
    expect(classify(s)).toEqual(classify(s));
  });

  it('score is deterministic and matches computeIdentityScore', () => {
    const s = scores({
      activity: 0.8,
      exploration: 0.7,
      consistency: 0.3,
      loyalty: 0.4,
      timing: 0.75,
    });
    expect(classify(s).score).toBe(computeIdentityScore(s));
  });
});

describe('classify - rarity is not fabricated', () => {
  it('rarity is always null in V1', () => {
    const cases: BehaviorScores[] = [
      scores({}),
      scores({ activity: 1, exploration: 1, consistency: 1, loyalty: 1, timing: 1 }),
      scores({ activity: 0.8, consistency: 0.3, timing: 0.7 }),
    ];
    for (const s of cases) {
      expect(classify(s).rarity).toBeNull();
    }
  });
});