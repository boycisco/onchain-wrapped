import { createPublicClient, http, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { loadConfig } from '@/app/core/config';
import { ProviderError } from '@/app/core/errors';

let cached: PublicClient | null = null;

/**
 * Return a configured Viem public client for Base mainnet.
 * Lazy — env is only read the first time a caller needs the chain.
 * The RPC URL is never hard-coded; it always comes from BASE_RPC_URL.
 */
export function getRpcClient(): PublicClient {
  if (cached) return cached;
  const config = loadConfig();
  cached = createPublicClient({
    chain: base,
    transport: http(config.baseRpcUrl, {
      retryCount: 2,
      retryDelay: 250,
      timeout: 10_000,
    }),
  }) as unknown as PublicClient;
  return cached;
}

/**
 * Tiny façade so callers do not depend on viem directly.
 * Translate any low-level error into our domain error.
 */
export const rpc = {
  async blockNumber(): Promise<bigint> {
    try {
      return await getRpcClient().getBlockNumber();
    } catch (err) {
      throw new ProviderError('Failed to fetch block number from Base RPC.', err);
    }
  },
};
