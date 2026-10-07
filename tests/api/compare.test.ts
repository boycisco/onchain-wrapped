import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/compare/route';
import { setIndexerForTesting, type Indexer } from '@/app/data/indexer';
import { setCacheForTesting } from '@/app/core/cache';
import type { Address, Transfer } from '@/app/core/models';

const A = '0x1111111111111111111111111111111111111111' as Address;
const B = '0x2222222222222222222222222222222222222222' as Address;

function transfer(hash: string, ts: number, from: Address, to: Address): Transfer {
  return {
    hash,
    uniqueId: `${hash}:x`,
    from,
    to,
    blockNumber: BigInt(Math.floor(ts / 12)),
    timestamp: ts,
    value: 1n,
    asset: 'ETH',
    contractAddress: null,
    decimals: 18,
    category: 'external',
    direction: 'out',
  };
}

const T = Math.floor(Date.parse('2026-03-01T12:00:00Z') / 1000);

// A wallet has 3 transfers; B wallet has 1.
const FIXTURES: Record<string, Transfer[]> = {
  [A.toLowerCase()]: [
    transfer('0xa1', T, A, B),
    transfer('0xa2', T + 100, A, B),
    transfer('0xa3', T + 200, A, B),
  ],
  [B.toLowerCase()]: [transfer('0xb1', T, B, A)],
};

const indexer: Indexer = {
  transfers: async (wallet) => FIXTURES[wallet.toLowerCase()] ?? [],
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/compare', () => {
  beforeEach(() => {
    setIndexerForTesting(indexer);
    setCacheForTesting(null);
    process.env.FORCE_ROAST_FALLBACK = '1';
  });
  afterEach(() => {
    setIndexerForTesting(null);
    setCacheForTesting(null);
    delete process.env.FORCE_ROAST_FALLBACK;
  });

  it('returns both wrappeds plus a comparison for two valid wallets', async () => {
    const res = await POST(makeRequest({ wallet: A, other: B }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      a: { wallet: string };
      b: { wallet: string };
      comparison: { overall: string; categories: unknown[] };
      cached: { a: boolean; b: boolean };
    };
    expect(json.a.wallet.toLowerCase()).toBe(A.toLowerCase());
    expect(json.b.wallet.toLowerCase()).toBe(B.toLowerCase());
    expect(json.comparison.categories.length).toBe(6);
    expect(['A', 'B', 'tie']).toContain(json.comparison.overall);
    expect(json.cached.a).toBe(false);
    expect(json.cached.b).toBe(false);
  });

  it('rejects comparing a wallet against itself', async () => {
    const res = await POST(makeRequest({ wallet: A, other: A }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INVALID_WALLET');
  });

  it('rejects an invalid other-wallet', async () => {
    const res = await POST(makeRequest({ wallet: A, other: 'nope' }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INVALID_WALLET');
  });

  it('rejects an invalid range', async () => {
    const res = await POST(makeRequest({ wallet: A, other: B, range: 'nextweek' }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INVALID_RANGE');
  });

  it('second call is served from cache for both wallets', async () => {
    const first = await POST(makeRequest({ wallet: A, other: B }));
    expect(first.status).toBe(200);
    const second = await POST(makeRequest({ wallet: A, other: B }));
    const json = (await second.json()) as { cached: { a: boolean; b: boolean } };
    expect(json.cached.a).toBe(true);
    expect(json.cached.b).toBe(true);
  });
});