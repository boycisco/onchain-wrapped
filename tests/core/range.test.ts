import { describe, it, expect } from 'vitest';
import { rangeFor, isRangeKey, inRange } from '@/app/core/range';

const NOW = new Date('2026-08-15T12:34:56.000Z');

describe('rangeFor', () => {
  it('year starts at Jan 1 UTC of the current year', () => {
    const r = rangeFor('year', NOW);
    expect(r.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(r.end.toISOString()).toBe(NOW.toISOString());
  });

  it('last90 is exactly 90 days back', () => {
    const r = rangeFor('last90', NOW);
    const diffDays = (r.end.getTime() - r.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(90);
  });

  it('last30 is exactly 30 days back', () => {
    const r = rangeFor('last30', NOW);
    const diffDays = (r.end.getTime() - r.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(30);
  });

  it('all starts at the Unix epoch', () => {
    const r = rangeFor('all', NOW);
    expect(r.start.getTime()).toBe(0);
    expect(r.end.toISOString()).toBe(NOW.toISOString());
  });
});

describe('isRangeKey', () => {
  it('accepts known keys', () => {
    expect(isRangeKey('year')).toBe(true);
    expect(isRangeKey('last90')).toBe(true);
    expect(isRangeKey('last30')).toBe(true);
    expect(isRangeKey('all')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isRangeKey('week')).toBe(false);
    expect(isRangeKey(undefined)).toBe(false);
    expect(isRangeKey(42)).toBe(false);
    expect(isRangeKey({})).toBe(false);
  });
});

describe('inRange', () => {
  const r = rangeFor('year', NOW);

  it('is inclusive on both ends', () => {
    const s = Math.floor(r.start.getTime() / 1000);
    const e = Math.floor(r.end.getTime() / 1000);
    expect(inRange(s, r)).toBe(true);
    expect(inRange(e, r)).toBe(true);
  });

  it('rejects timestamps outside', () => {
    const s = Math.floor(r.start.getTime() / 1000);
    const e = Math.floor(r.end.getTime() / 1000);
    expect(inRange(s - 1, r)).toBe(false);
    expect(inRange(e + 1, r)).toBe(false);
  });
});
