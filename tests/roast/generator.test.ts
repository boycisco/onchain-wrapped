import { describe, it, expect, vi } from 'vitest';
import {
  generateRoast,
  validateRoastOutput,
} from '@/app/roast/generator';
import { buildPrompt } from '@/app/roast/prompts';
import { pickFallback } from '@/app/roast/templates';
import { analyzeActivity } from '@/app/analysis/activity';
import { analyzeContracts } from '@/app/analysis/contracts';
import { analyzeTiming } from '@/app/analysis/timing';
import { analyzeBehavior } from '@/app/analysis/behavior';
import { analyzeMoney } from '@/app/analysis/money';
import { classify } from '@/app/identity/score';
import type { RoastInput } from '@/app/roast/types';
import { makeActivity, makeRange, txsOnDay } from '../fixtures/build';

function buildInput(): RoastInput {
  const activity = makeActivity(
    [
      ...txsOnDay('2026-03-01', 12, 22), // night
      ...txsOnDay('2026-03-02', 8, 23),  // late-night
      ...txsOnDay('2026-03-05', 3, 14),
    ],
    makeRange(),
  );
  const act = analyzeActivity(activity);
  const ctr = analyzeContracts(activity);
  const tim = analyzeTiming(activity);
  const mon = analyzeMoney(activity);
  const beh = analyzeBehavior({ activity: act, contracts: ctr, timing: tim, money: mon });
  const id = classify(beh);
  return {
    walletShort: '0x1234...5678',
    range: activity.range,
    activity: act,
    contracts: ctr,
    timing: tim,
    behavior: beh,
    identity: { name: id.name, score: id.score, traits: id.traits },
  };
}

describe('buildPrompt', () => {
  it('only includes verified facts (no raw provider data)', () => {
    const prompt = buildPrompt(buildInput());
    expect(prompt).toContain('Total transactions:');
    expect(prompt).toContain('Active days:');
    expect(prompt).toContain('Unique addresses interacted with:');
    expect(prompt).toContain('Identity:');
    expect(prompt).not.toContain('rawContract');
    expect(prompt).not.toContain('uniqueId');
    expect(prompt).not.toContain('alchemy');
    expect(prompt).not.toContain('ALCHEMY_API_KEY');
  });

  it('states the 5-line maximum and anti-fabrication rule', () => {
    const prompt = buildPrompt(buildInput());
    expect(prompt).toMatch(/Maximum 5 lines/i);
    expect(prompt).toMatch(/do not invent/i);
  });
});

describe('validateRoastOutput', () => {
  const facts = 'Total transactions: 23 Active days: 3';

  it('accepts a valid multiline output', () => {
    const out = validateRoastOutput('Line one.\nLine two.\nLine three.', facts);
    expect(out).toEqual(['Line one.', 'Line two.', 'Line three.']);
  });

  it('caps to 5 lines', () => {
    const raw = Array.from({ length: 9 }, (_, i) => `Line ${i + 1}.`).join('\n');
    const out = validateRoastOutput(raw, facts);
    expect(out).toHaveLength(5);
  });

  it('drops empty lines', () => {
    const out = validateRoastOutput('A.\n\n\nB.\n', facts);
    expect(out).toEqual(['A.', 'B.']);
  });

  it('strips leading bullets and numbering', () => {
    // Include a literal bullet char via JS escape so this source stays ASCII.
    const raw = '1. First.\n- Second.\n\u2022 Third.';
    const out = validateRoastOutput(raw, facts);
    expect(out).toEqual(['First.', 'Second.', 'Third.']);
  });

  it('returns null for empty input', () => {
    expect(validateRoastOutput('', facts)).toBeNull();
    expect(validateRoastOutput('   \n  \n', facts)).toBeNull();
  });

  it('rejects output with fabricated 3+ digit numbers', () => {
    const out = validateRoastOutput('You lost 8432 dollars.', facts);
    expect(out).toBeNull();
  });

  it('allows 3+ digit numbers that appear in the prompt facts', () => {
    const f = 'Total transactions: 1234';
    const out = validateRoastOutput('You made 1234 transactions.', f);
    expect(out).not.toBeNull();
  });
});

describe('pickFallback', () => {
  it('returns a non-empty list of up to 5 lines for every identity shape', () => {
    const input = buildInput();
    const lines = pickFallback(input);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(5);
    for (const l of lines) expect(typeof l).toBe('string');
  });

  it('is deterministic for the same input', () => {
    const input = buildInput();
    expect(pickFallback(input)).toEqual(pickFallback(input));
  });

  it('falls back to default when the identity name is unknown', () => {
    const input = { ...buildInput(), identity: { name: 'THE UNKNOWN THING', score: 0, traits: [] } };
    const lines = pickFallback(input);
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('generateRoast - AI path', () => {
  it('uses the model output when valid', async () => {
    const callModel = vi.fn().mockResolvedValue('First line.\nSecond line.');
    const roast = await generateRoast(buildInput(), { callModel });
    expect(roast.source).toBe('gemini');
    expect(roast.lines).toEqual(['First line.', 'Second line.']);
    expect(callModel).toHaveBeenCalledOnce();
  });

  it('caps model output to 5 lines', async () => {
    const raw = Array.from({ length: 10 }, (_, i) => `L${i + 1}.`).join('\n');
    const callModel = vi.fn().mockResolvedValue(raw);
    const roast = await generateRoast(buildInput(), { callModel });
    expect(roast.source).toBe('gemini');
    expect(roast.lines).toHaveLength(5);
  });

  it('falls back when the model invents numbers', async () => {
    const callModel = vi.fn().mockResolvedValue('You lost 9999 dollars onchain.');
    const roast = await generateRoast(buildInput(), { callModel });
    expect(roast.source).toBe('fallback');
    expect(roast.fallbackReason).toBe('invalid_model_output');
    expect(roast.lines.length).toBeGreaterThan(0);
  });

  it('falls back when the model returns empty output', async () => {
    const callModel = vi.fn().mockResolvedValue('   \n\n');
    const roast = await generateRoast(buildInput(), { callModel });
    expect(roast.source).toBe('fallback');
  });
});

describe('generateRoast - failure handling', () => {
  it('falls back when the model throws', async () => {
    const callModel = vi.fn().mockRejectedValue(new Error('boom'));
    const roast = await generateRoast(buildInput(), { callModel });
    expect(roast.source).toBe('fallback');
    expect(roast.fallbackReason).toBe('boom');
    expect(roast.lines.length).toBeGreaterThan(0);
  });

  it('never throws, even when everything fails', async () => {
    const callModel = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(
      generateRoast(buildInput(), { callModel }),
    ).resolves.toBeDefined();
  });

  it('forceFallback bypasses the model entirely', async () => {
    const callModel = vi.fn();
    const roast = await generateRoast(buildInput(), {
      callModel,
      forceFallback: true,
    });
    expect(callModel).not.toHaveBeenCalled();
    expect(roast.source).toBe('fallback');
    expect(roast.fallbackReason).toBe('forced');
  });
});

describe('generateRoast - line count', () => {
  it('always produces between 1 and 5 lines', async () => {
    const cases = [
      vi.fn().mockResolvedValue('ok'),
      vi.fn().mockRejectedValue(new Error('x')),
      vi.fn().mockResolvedValue(''),
      vi.fn().mockResolvedValue('1. a\n2. b\n3. c\n4. d\n5. e\n6. f\n7. g'),
    ];
    for (const callModel of cases) {
      const roast = await generateRoast(buildInput(), { callModel });
      expect(roast.lines.length).toBeGreaterThanOrEqual(1);
      expect(roast.lines.length).toBeLessThanOrEqual(5);
    }
  });
});


describe('validateRoastOutput - leading marker handling', () => {
  const facts = 'Total transactions: 42 Active days: 5';

  it('strips numbered list markers with a dot', () => {
    expect(validateRoastOutput('1. First.\n2. Second.', facts)).toEqual([
      'First.',
      'Second.',
    ]);
  });

  it('strips numbered list markers with a paren', () => {
    expect(validateRoastOutput('1) First.\n2) Second.', facts)).toEqual([
      'First.',
      'Second.',
    ]);
  });

  it('strips dash, asterisk, and bullet markers', () => {
    expect(validateRoastOutput('- First.\n* Second.\n\u2022 Third.', facts)).toEqual([
      'First.',
      'Second.',
      'Third.',
    ]);
  });

  it('does NOT strip leading digits that are part of the content', () => {
    // "42" is a fact and belongs to the sentence.
    const out = validateRoastOutput('42 transactions is a lot.', facts);
    expect(out).toEqual(['42 transactions is a lot.']);
  });

  it('rejects fabricated 3+ digit numbers at the start of a line', () => {
    // "123" is not in the facts.
    const out = validateRoastOutput('123 things happened onchain.', facts);
    expect(out).toBeNull();
  });

  it('anti-fabrication check runs BEFORE marker stripping', () => {
    // Regression: the old code stripped leading digits first, so a fabricated
    // number at the start of a line vanished before the numeric check ran.
    const out = validateRoastOutput('123. of your transactions were silly.', facts);
    expect(out).toBeNull();
  });

  it('preserves content when a line has no marker', () => {
    const out = validateRoastOutput('You had a busy year.', facts);
    expect(out).toEqual(['You had a busy year.']);
  });

  it('handles empty-after-strip lines by dropping them', () => {
    const out = validateRoastOutput('1.  \nReal content.', facts);
    expect(out).toEqual(['Real content.']);
  });
});