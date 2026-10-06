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
 * Return the configured Indexer. Lazily constructed so that importing this
 * module does not require env or network access. In tests, prefer
 * setIndexerForTesting() to avoid touching the real provider.
 */
export function getIndexer(): Indexer {
  if (override) return override;
  if (cached) return cached;
  // Lazy import to avoid pulling Alchemy into non-network test files.
  const { createAlchemyIndexer } = require('./alchemy') as typeof import('./alchemy');
  cached = createAlchemyIndexer();
  return cached;
}
