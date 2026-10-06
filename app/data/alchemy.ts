import { loadConfig } from '@/app/core/config';
import { ConfigError, ProviderError } from '@/app/core/errors';
import type { Address, Range, Transfer } from '@/app/core/models';
import { inRange } from '@/app/core/range';
import type { Indexer } from './indexer';
import {
  normalizeTransfers,
  type AlchemyRawResponse,
  type AlchemyRawTransfer,
} from './normalize';

const ALCHEMY_BASE = 'https://base-mainnet.g.alchemy.com/v2';
const PAGE_SIZE_HEX = '0x3e8'; // 1000
const DEFAULT_MAX_PAGES = 10;

const CATEGORIES = [
  'external',
  'internal',
  'erc20',
  'erc721',
  'erc1155',
  'specialnft',
] as const;

export type AlchemyOptions = {
  /** Max pagination rounds per direction. Default 10 (= up to 10k transfers). */
  maxPages?: number;
  /** Retry attempts for transient failures. Default 3. */
  maxRetries?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callJsonRpc<T>(
  url: string,
  method: string,
  params: unknown[],
  maxRetries: number,
): Promise<T> {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (res.status === 429) {
        lastErr = new ProviderError('Alchemy rate-limited (429)');
        await sleep(400 * Math.pow(2, attempt));
        continue;
      }
      if (!res.ok) {
        lastErr = new ProviderError(`Alchemy HTTP ${res.status}`);
        if (res.status >= 500 && attempt < maxRetries - 1) {
          await sleep(400 * Math.pow(2, attempt));
          continue;
        }
        throw lastErr;
      }

      const json = (await res.json()) as
        | { result?: T; error?: { message?: string } }
        | undefined;

      if (!json || json.error) {
        throw new ProviderError(
          `Alchemy error: ${json?.error?.message ?? 'unknown'}`,
        );
      }
      if (json.result === undefined) {
        throw new ProviderError('Alchemy returned no result');
      }
      return json.result;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries - 1) {
        await sleep(400 * Math.pow(2, attempt));
      }
    }
  }
  throw lastErr instanceof ProviderError
    ? lastErr
    : new ProviderError('Alchemy request failed after retries', lastErr);
}

async function fetchDirection(
  url: string,
  wallet: Address,
  direction: 'from' | 'to',
  rangeStartSec: number,
  maxPages: number,
  maxRetries: number,
): Promise<AlchemyRawTransfer[]> {
  const collected: AlchemyRawTransfer[] = [];
  let pageKey: string | undefined = undefined;
  let pages = 0;

  while (pages < maxPages) {
    const params: Record<string, unknown> = {
      fromBlock: '0x0',
      toBlock: 'latest',
      category: [...CATEGORIES],
      withMetadata: true,
      excludeZeroValue: false,
      maxCount: PAGE_SIZE_HEX,
      order: 'desc',
      [direction === 'from' ? 'fromAddress' : 'toAddress']: wallet,
    };
    if (pageKey) params.pageKey = pageKey;

    const result = await callJsonRpc<AlchemyRawResponse>(
      url,
      'alchemy_getAssetTransfers',
      [params],
      maxRetries,
    );

    const page = result.transfers ?? [];
    collected.push(...page);

    // Early stop: if the oldest item on this page predates the range start,
    // everything beyond will too (we asked for descending order).
    const oldest = page[page.length - 1];
    const oldestIso = oldest?.metadata?.blockTimestamp;
    if (oldestIso) {
      const ts = Math.floor(Date.parse(oldestIso) / 1000);
      if (!Number.isNaN(ts) && ts < rangeStartSec) break;
    }

    if (!result.pageKey) break;
    pageKey = result.pageKey;
    pages++;
  }

  return collected;
}

export function createAlchemyIndexer(options: AlchemyOptions = {}): Indexer {
  const config = loadConfig();
  if (!config.alchemyApiKey) {
    throw new ConfigError('ALCHEMY_API_KEY is required for the Alchemy indexer', [
      'ALCHEMY_API_KEY: missing',
    ]);
  }

  const url = `${ALCHEMY_BASE}/${config.alchemyApiKey}`;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const maxRetries = options.maxRetries ?? 3;

  return {
    async transfers(wallet: Address, range: Range): Promise<Transfer[]> {
      const rangeStartSec = Math.floor(range.start.getTime() / 1000);

      const outgoing = await fetchDirection(
        url,
        wallet,
        'from',
        rangeStartSec,
        maxPages,
        maxRetries,
      );
      const incoming = await fetchDirection(
        url,
        wallet,
        'to',
        rangeStartSec,
        maxPages,
        maxRetries,
      );

      const normalized = normalizeTransfers(
        [...outgoing, ...incoming],
        wallet,
      );

      return normalized.filter((t) => inRange(t.timestamp, range));
    },
  };
}
