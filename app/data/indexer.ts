import type { Address, Range, Transfer } from '@/app/core/models';

/**
 * The boundary between "where data comes from" and "what we do with it".
 * Analysis code MUST depend on this interface (or on the models it returns),
 * never on a concrete implementation such as app/data/alchemy.ts.
 *
 * Implementations are responsible for:
 *  - pagination
 *  - retries with backoff
 *  - translating provider errors into ProviderError
 *  - returning data already normalized into our internal models
 */
export type Indexer = {
  transfers(wallet: Address, range: Range): Promise<Transfer[]>;
};

// Simple test seam. Real factory (getIndexer) is added in Step 4b
// once the Alchemy adapter exists.
let override: Indexer | null = null;

export function setIndexerForTesting(indexer: Indexer | null): void {
  override = indexer;
}

export function getIndexerOverride(): Indexer | null {
  return override;
}
