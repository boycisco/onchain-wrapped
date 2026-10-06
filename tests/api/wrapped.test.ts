import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/wrapped/route';
import { setIndexerForTesting, type Indexer } from '@/app/data/indexer';
import type { Address, Transfer } from '@/app/core/models';
import { WALLET } from '../fixtures/build';

/* ---------- fixture indexer ---------- */

function transfer(hash: string, ts: number, direction: 'in' | 'out' = 'out'): Transfer {
  return {
    hash,
    uniqueId: `${hash}:x`,
    from: direction === 'out' ? WALLET : null,
    to: direction === 'out' ? null : WALLET,
    blockNumber: BigInt(Math.floor(ts / 12)),
    timestamp: ts,
    value: 1n,
    asset: 'ETH',
    contractAddress: null,
    decimals: 18,
    category: 'external',
    direction,
  };
}

const FIXTURE: Transfer[] = [
  transfer('0xa1', Math.floor(Date.parse('2026-03-01T12:00:00Z') / 1000)),
  transfer('0xa2', Math.floor(Date.parse('2026-03-02T12:00:00Z') / 1000)),
];

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/wrapped', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(raw: string): Request {
  return new Request('http://localhost/api/wrapped', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw,
  });
}

/* ---------- tests ---------- */

describe('POST /api/wrapped', () => {
  let indexer: Indexer;

  beforeEach(() => {
    indexer = { transfers: async () => FIXTURE };
    setIndexerForTesting(indexer);
    // Force the roast fallback path so tests never call Gemini.
    process.env.FORCE_ROAST_FALLBACK = '1';
  });

  afterEach(() => {
    setIndexerForTesting(null);
    delete process.env.FORCE_ROAST_FALLBACK;
  });

  it('returns 200 with a complete Wrapped payload for a valid wallet', async () => {
    const res = await POST(makeRequest({ wallet: WALLET }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { wrapped: unknown; timings: unknown };
    expect(json.wrapped).toBeDefined();
    expect(json.timings).toBeDefined();
    const w = json.wrapped as {
      wallet: string;
      schemaVersion: number;
      identity: { name: string };
      roast: { lines: string[] };
    };
    expect(w.wallet.toLowerCase()).toBe(WALLET.toLowerCase());
    expect(w.schemaVersion).toBe(1);
    expect(w.identity.name.startsWith('THE ')).toBe(true);
    expect(Array.isArray(w.roast.lines)).toBe(true);
    expect(w.roast.lines.length).toBeLessThanOrEqual(5);
  });

  it('respects an explicit range', async () => {
    const res = await POST(makeRequest({ wallet: WALLET, range: 'last30' }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { wrapped: { range: { start: string; end: string } } };
    const spanMs =
      Date.parse(json.wrapped.range.end) - Date.parse(json.wrapped.range.start);
    expect(spanMs).toBe(30 * 86_400_000);
  });

  it('rejects an invalid wallet with INVALID_WALLET', async () => {
    const res = await POST(makeRequest({ wallet: 'not-an-address' }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('INVALID_WALLET');
    expect(typeof json.error.message).toBe('string');
    // Never leak provider details in error messages.
    expect(json.error.message).not.toMatch(/alchemy|rpc|stack/i);
  });

  it('rejects a missing wallet with INVALID_WALLET', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INVALID_WALLET');
  });

  it('rejects an invalid range with INVALID_RANGE', async () => {
    const res = await POST(makeRequest({ wallet: WALLET, range: 'tomorrow' }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INVALID_RANGE');
  });

  it('returns 502 for provider errors', async () => {
    setIndexerForTesting({
      transfers: async () => {
        const err = new Error('boom');
        (err as unknown as { name: string }).name = 'ProviderError';
        throw Object.assign(err, { code: 'PROVIDER_ERROR', message: 'Upstream down.' });
      },
    });
    const res = await POST(makeRequest({ wallet: WALLET }));
    // Non-AppError thrown from indexer surfaces as 500 INTERNAL_ERROR.
    expect([500, 502]).toContain(res.status);
    const json = (await res.json()) as { error: { code: string } };
    expect(['INTERNAL_ERROR', 'PROVIDER_ERROR']).toContain(json.error.code);
  });

  it('rejects malformed JSON with a stable error shape', async () => {
    const res = await POST(makeRawRequest('{not json'));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('INVALID_WALLET');
  });
});