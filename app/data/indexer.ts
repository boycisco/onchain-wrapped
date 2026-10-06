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

/* ---------- Test seam ---------- */

let override: Indexer | null = null;

export function setIndexerForTesting(indexer: Indexer | null): void {
  override = indexer;
}

/* ---------- Production factory ---------- */

let cached: Indexer | null = null;

/**
 * Return the configured Indexer. Async so we can use dynamic import() rather
 * than require(), which does not exist in ESM. In tests, prefer
 * setIndexerForTesting() to avoid touching the real provider.
 */
export async function getIndexer(): Promise<Indexer> {
  if (override) return override;
  if (cached) return cached;
  const { createAlchemyIndexer } = await import('./alchemy');
  cached = createAlchemyIndexer();
  return cached;
}