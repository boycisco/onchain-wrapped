import { describe, it, expect } from 'vitest';
import { parseAddress, tryParseAddress } from '@/app/core/address';
import { InvalidAddressError } from '@/app/core/errors';

const GOOD = '0x4200000000000000000000000000000000000006'; // WETH on Base
const GOOD_MIXED = '0x4200000000000000000000000000000000000006';

describe('parseAddress', () => {
  it('accepts a valid lowercase address and returns checksummed', () => {
    const out = parseAddress(GOOD);
    expect(out.startsWith('0x')).toBe(true);
    expect(out.toLowerCase()).toBe(GOOD.toLowerCase());
  });

  it('trims surrounding whitespace', () => {
    const out = parseAddress(`   ${GOOD}   `);
    expect(out.toLowerCase()).toBe(GOOD.toLowerCase());
  });

  it('rejects non-strings', () => {
    expect(() => parseAddress(42)).toThrow(InvalidAddressError);
    expect(() => parseAddress(null)).toThrow(InvalidAddressError);
    expect(() => parseAddress(undefined)).toThrow(InvalidAddressError);
  });

  it('rejects empty strings', () => {
    expect(() => parseAddress('')).toThrow(InvalidAddressError);
    expect(() => parseAddress('   ')).toThrow(InvalidAddressError);
  });

  it('rejects malformed hex', () => {
    expect(() => parseAddress('0x123')).toThrow(InvalidAddressError);
    expect(() => parseAddress('not-an-address')).toThrow(InvalidAddressError);
    expect(() => parseAddress('0xZZ00000000000000000000000000000000000006')).toThrow(
      InvalidAddressError,
    );
  });
});

describe('tryParseAddress', () => {
  it('returns null on invalid input', () => {
    expect(tryParseAddress('nope')).toBeNull();
    expect(tryParseAddress(123)).toBeNull();
  });

  it('returns checksummed address on valid input', () => {
    const out = tryParseAddress(GOOD_MIXED);
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toBe(GOOD.toLowerCase());
  });
});
