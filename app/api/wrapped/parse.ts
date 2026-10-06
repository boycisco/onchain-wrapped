import { z } from 'zod';
import { parseAddress } from '@/app/core/address';
import { InvalidRangeError } from '@/app/core/errors';
import { isRangeKey, type RangeKey } from '@/app/core/range';
import type { Address } from '@/app/core/models';

export type WrappedRequest = {
  wallet: Address;
  range: RangeKey;
};

const bodySchema = z
  .object({
    wallet: z.unknown(),
    range: z.unknown().optional(),
  })
  .passthrough();

/**
 * Parse and validate a POST /api/wrapped body.
 * Address validation lives in core/address; range validation lives in core/range.
 * Any malformed input throws an AppError with the right code.
 */
export function parseWrappedRequest(input: unknown): WrappedRequest {
  const parsed = bodySchema.parse(input ?? {});
  const wallet = parseAddress(parsed.wallet);

  let range: RangeKey = 'year';
  if (parsed.range !== undefined && parsed.range !== null) {
    if (typeof parsed.range !== 'string' || !isRangeKey(parsed.range)) {
      throw new InvalidRangeError(
        'Range must be one of: year, last90, last30, all.',
      );
    }
    range = parsed.range;
  }

  return { wallet, range };
}