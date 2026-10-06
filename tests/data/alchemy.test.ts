import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Set required env BEFORE importing alchemy.
process.env.BASE_RPC_URL = 'https://mainnet.base.org';
process.env.ALCHEMY_API_KEY = 'test-key';

import { createAlchemyIndexer } from '@/app/data/alchemy';
import { rangeFor } from '@/app/core/range';
import type { Address } from '@/app/core/models';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678' as Address;

function loadFixture(name: string): unknown {
  const p = path.join(__dirname, '..', 'fixtures', 'raw', name);
  return JSON.parse(readFileSync(p, 'utf8'));
}

const PAGE1 = loadFixture('alchemy-page1.json');
const PAGE2 = loadFixture('alchemy-page2.json');

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createAlchemyIndexer', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('paginates through both directions and returns normalized transfers', async () => {
    // Outgoing (fromAddress): page1 (with pageKey) then page2 (no pageKey).
    // Incoming (toAddress):  page1 once, pageKey stripped so we stop.
    let fromCall = 0;
    let toCall = 0;

    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        params: [{ fromAddress?: string; toAddress?: string; pageKey?: string }];
      };
      const p = body.params[0];
      const isFrom = p.fromAddress?.toLowerCase() === WALLET.toLowerCase();
      if (isFrom) {
        fromCall++;
        if (fromCall === 1) {
          return jsonResponse({ result: { ...(PAGE1 as object), pageKey: 'PK2' } });
        }
        return jsonResponse({ result: PAGE2 });
      }
      toCall++;
      // Strip pageKey so the adapter stops after this single 'to' page.
      const { pageKey: _drop, ...page1NoKey } = PAGE1 as { pageKey?: string };
      return jsonResponse({ result: page1NoKey });
    });

    const indexer = createAlchemyIndexer({ maxPages: 5, maxRetries: 1 });
    const range = rangeFor('all', new Date('2026-12-31T00:00:00.000Z'));
    const transfers = await indexer.transfers(WALLET, range);

    expect(fromCall).toBe(2);   // page 1, then page 2 (no pageKey -> stop)
    expect(toCall).toBe(1);     // single page, pageKey stripped -> stop
    expect(transfers.length).toBeGreaterThanOrEqual(6);
  });

  it('stops after maxPages even if pageKey is returned forever', async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls++;
      return jsonResponse({ result: { ...(PAGE1 as object), pageKey: 'FOREVER' } });
    });

    const indexer = createAlchemyIndexer({ maxPages: 3, maxRetries: 1 });
    const range = rangeFor('all', new Date('2026-12-31T00:00:00.000Z'));
    await indexer.transfers(WALLET, range);

    // 3 pages for outgoing + 3 pages for incoming = 6 calls, then stops.
    expect(calls).toBe(6);
  });

  it('filters transfers outside the requested range', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ result: PAGE1 }),
    );

    const indexer = createAlchemyIndexer({ maxPages: 1, maxRetries: 1 });
    // Range that only covers Feb 2026, before any fixture timestamps.
    const range = rangeFor('last30', new Date('2026-03-01T00:00:00.000Z'));
    const transfers = await indexer.transfers(WALLET, range);
    expect(transfers).toHaveLength(0);
  });

  it('retries on 429 then succeeds', async () => {
    let attempt = 0;
    fetchMock.mockImplementation(async () => {
      attempt++;
      if (attempt === 1) return new Response('rate-limited', { status: 429 });
      return jsonResponse({ result: PAGE2 });
    });

    const indexer = createAlchemyIndexer({ maxPages: 1, maxRetries: 3 });
    const range = rangeFor('all', new Date('2026-12-31T00:00:00.000Z'));
    const transfers = await indexer.transfers(WALLET, range);
    expect(transfers.length).toBeGreaterThan(0);
    expect(attempt).toBeGreaterThanOrEqual(2);
  });
});
