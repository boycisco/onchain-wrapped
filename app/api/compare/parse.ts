import { z } from 'zod';
import { parseAddress } from '@/app/core/address';
import { InvalidAddressError, InvalidRangeError } from '@/app/core/errors';
import { isRangeKey, type RangeKey } from '@/app/core/range';
import type { Address } from '@/app/core/models';

export type CompareRequest = {
  wallet: Address;
  other: Address;
  range: RangeKey;
};

const bodySchema = z
  .object({
    wallet: z.unknown(),
    other: z.unknown(),
    range: z.unknown().optional(),
  })
  .passthrough();

export function parseCompareRequest(input: unknown): CompareRequest {
  const parsed = bodySchema.parse(input ?? {});
  const wallet = parseAddress(parsed.wallet);
  const other = parseAddress(parsed.other);
  if (wallet.toLowerCase() === other.toLowerCase()) {
    throw new InvalidAddressError(
      'Cannot compare a wallet against itself.',
    );
  }

  let range: RangeKey = 'year';
  if (parsed.range !== undefined && parsed.range !== null) {
    if (typeof parsed.range !== 'string' || !isRangeKey(parsed.range)) {
      throw new InvalidRangeError(
        'Range must be one of: year, last90, last30, all.',
      );
    }
    range = parsed.range;
  }

  return { wallet, other, range };
}