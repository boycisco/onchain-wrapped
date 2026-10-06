import { isAddress, getAddress, type Address } from 'viem';
import { InvalidAddressError } from './errors';

/**
 * Validate and normalize a user-supplied wallet address.
 * - Rejects non-strings and malformed hex.
 * - Returns a checksummed Address on success.
 * - Throws InvalidAddressError on failure (mapped to INVALID_WALLET by the API).
 */
export function parseAddress(input: unknown): Address {
  if (typeof input !== 'string') {
    throw new InvalidAddressError('Wallet address must be a string.');
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new InvalidAddressError('Wallet address is required.');
  }
  if (!isAddress(trimmed)) {
    throw new InvalidAddressError();
  }
  return getAddress(trimmed);
}

/**
 * Non-throwing variant. Useful in conditionals.
 */
export function tryParseAddress(input: unknown): Address | null {
  try {
    return parseAddress(input);
  } catch {
    return null;
  }
}
