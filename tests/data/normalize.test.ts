import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  normalizeTransfer,
  normalizeTransfers,
  groupTransactions,
  type AlchemyRawResponse,
} from '@/app/data/normalize';
import type { Address } from '@/app/core/models';

const WALLET = '0x1234567890abcdef1234567890abcdef12345678' as Address;

function loadFixture(name: string): AlchemyRawResponse {
  const p = path.join(__dirname, '..', 'fixtures', 'raw', name);
  return JSON.parse(readFileSync(p, 'utf8')) as AlchemyRawResponse;
}

describe('normalizeTransfers', () => {
  const page1 = loadFixture('alchemy-page1.json');
  const page2 = loadFixture('alchemy-page2.json');
  const all = normalizeTransfers(
    [...(page1.transfers ?? []), ...(page2.transfers ?? [])],
    WALLET,
  );

  it('produces one Transfer per raw entry', () => {
    expect(all).toHaveLength(6);
  });

  it('classifies direction correctly', () => {
    const byHash = new Map(all.map((t) => [t.hash, t]));
    expect(byHash.get('0xaaa1111111111111111111111111111111111111111111111111111111111111')?.direction).toBe('out');
    expect(byHash.get('0xbbb2222222222222222222222222222222222222222222222222222222222222')?.direction).toBe('in');
    expect(byHash.get('0xccc3333333333333333333333333333333333333333333333333333333333333')?.direction).toBe('out');
    expect(byHash.get('0xddd4444444444444444444444444444444444444444444444444444444444444')?.direction).toBe('in');
  });

  it('assigns asset/decimals/contract per category', () => {
    const erc20 = all.find((t) => t.category === 'erc20')!;
    expect(erc20.asset).toBe('USDC');
    expect(erc20.decimals).toBe(6);
    expect(erc20.contractAddress?.toLowerCase()).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');

    const native = all.find((t) => t.category === 'external')!;
    expect(native.asset).toBe('ETH');
    expect(native.decimals).toBe(18);
    expect(native.contractAddress).toBeNull();

    const nft = all.find((t) => t.category === 'erc721')!;
    expect(nft.asset).toBeNull();
    expect(nft.decimals).toBe(0);
    expect(nft.value).toBe(1n);
  });

  it('parses raw integer values as bigint', () => {
    const out = all.find(
      (t) => t.hash === '0xccc3333333333333333333333333333333333333333333333333333333333333',
    )!;
    expect(out.value).toBe(100_000_000n); // 100 USDC at 6 decimals
  });

  it('parses block numbers and timestamps', () => {
    const incoming = all.find(
      (t) => t.hash === '0xbbb2222222222222222222222222222222222222222222222222222222222222',
    )!;
    expect(incoming.blockNumber).toBe(20_000_001n);
    expect(incoming.timestamp).toBe(
      Math.floor(Date.parse('2026-03-15T15:00:00.000Z') / 1000),
    );
  });

  it('dedupes by uniqueId', () => {
    const raw = page1.transfers ?? [];
    const doubled = normalizeTransfers([...raw, ...raw], WALLET);
    expect(doubled).toHaveLength(raw.length);
  });

  it('skips entries with no hash', () => {
    const broken = normalizeTransfer(
      { ...(page1.transfers ?? [])[0]!, hash: '' } as never,
      WALLET,
    );
    expect(broken).toBeNull();
  });
});

describe('groupTransactions', () => {
  it('groups transfers by hash and sorts ascending', () => {
    const page1 = loadFixture('alchemy-page1.json');
    const page2 = loadFixture('alchemy-page2.json');
    const transfers = normalizeTransfers(
      [...(page1.transfers ?? []), ...(page2.transfers ?? [])],
      WALLET,
    );
    const txs = groupTransactions(transfers);
    expect(txs).toHaveLength(6);
    for (let i = 1; i < txs.length; i++) {
      expect(txs[i]!.blockNumber >= txs[i - 1]!.blockNumber).toBe(true);
    }
  });
});


describe('normalizeTransfers - real Alchemy shapes', () => {
  const real = loadFixture('alchemy-real-shape.json');
  const all = normalizeTransfers(real.transfers ?? [], WALLET);

  it('handles null value / decimal / asset on ERC721', () => {
    const nft = all.find((t) => t.category === 'erc721')!;
    expect(nft).toBeDefined();
    expect(nft.value).toBe(1n);
    expect(nft.decimals).toBe(0);
    expect(nft.asset).toBeNull();
    expect(nft.contractAddress?.toLowerCase()).toBe(
      '0x03ee701d8c5762ae401e4f8aae38613ac85dce86',
    );
  });

  it('handles standard external ETH transfer', () => {
    const eth = all.find((t) => t.category === 'external')!;
    expect(eth.value).toBe(50_000_000_000_000_000n); // 0.05 ETH
    expect(eth.decimals).toBe(18);
    expect(eth.asset).toBe('ETH');
    expect(eth.direction).toBe('out');
  });

  it('handles ERC20 with full 32-byte tokenId fields absent', () => {
    const erc20 = all.find((t) => t.category === 'erc20')!;
    expect(erc20.value).toBe(42_500_000n); // 42.5 USDC at 6 decimals
    expect(erc20.decimals).toBe(6);
    expect(erc20.asset).toBe('USDC');
    expect(erc20.direction).toBe('in');
  });

  it('uses Alchemy uniqueId verbatim when provided', () => {
    const nft = all.find((t) => t.category === 'erc721')!;
    expect(nft.uniqueId).toBe(
      '0xdead2fee2e318b80e49b81ad36e174670ddecde7d003133bf16a8158c153ecbc:log:457',
    );
  });
});