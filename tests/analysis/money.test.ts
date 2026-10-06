import { describe, it, expect } from 'vitest';
import { analyzeMoney } from '@/app/analysis/money';
import type {
  Activity,
  Address,
  Transaction,
  Transfer,
  TransferCategory,
  Direction,
} from '@/app/core/models';
import { WALLET, makeRange } from '../fixtures/build';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;
const DAI  = '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as Address;
const WETH = '0x4200000000000000000000000000000000000006' as Address;

let counter = 0;
function mkTransfer(
  partial: Partial<Transfer> & {
    value: bigint;
    category: TransferCategory;
    direction: Direction;
  },
): Transfer {
  counter++;
  const hash = `0x${String(counter).padStart(64, '0')}`;
  return {
    hash,
    uniqueId: `${hash}:t`,
    from: null,
    to: null,
    blockNumber: BigInt(counter),
    timestamp: 1_700_000_000 + counter,
    asset: null,
    contractAddress: null,
    decimals: null,
    ...partial,
  };
}

function activityWith(transfers: Transfer[]): Activity {
  const byHash = new Map<string, Transfer[]>();
  for (const t of transfers) {
    const arr = byHash.get(t.hash) ?? [];
    arr.push(t);
    byHash.set(t.hash, arr);
  }
  const txs: Transaction[] = Array.from(byHash.entries()).map(([hash, list]) => ({
    hash,
    blockNumber: list[0]!.blockNumber,
    timestamp: list[0]!.timestamp,
    from: list[0]!.from,
    to: list[0]!.to,
    transfers: list,
    status: 'unknown',
  }));
  return {
    wallet: WALLET,
    range: makeRange(),
    transfers,
    transactions: txs,
  };
}

describe('analyzeMoney - empty', () => {
  it('returns zeros and nulls', () => {
    const s = analyzeMoney(activityWith([]));
    expect(s.native.sent).toBe('0');
    expect(s.native.received).toBe('0');
    expect(s.native.net).toBe('0');
    expect(s.native.sentCount).toBe(0);
    expect(s.native.receivedCount).toBe(0);
    expect(s.native.largestOut).toBeNull();
    expect(s.native.largestIn).toBeNull();
    expect(s.native.largestOverall).toBeNull();
    expect(s.tokens).toEqual([]);
    expect(s.mostUsedStablecoin).toBeNull();
    expect(s.mostUsedToken).toBeNull();
    expect(s.totalTransfers).toBe(0);
    expect(s.usdValuation).toBe('unavailable');
  });
});

describe('analyzeMoney - native', () => {
  it('sums outgoing and incoming native transfers separately', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 1_000n, category: 'external', direction: 'out', asset: 'ETH', decimals: 18 }),
        mkTransfer({ value: 2_500n, category: 'external', direction: 'out', asset: 'ETH', decimals: 18 }),
        mkTransfer({ value: 500n, category: 'external', direction: 'in', asset: 'ETH', decimals: 18 }),
      ]),
    );
    expect(s.native.sent).toBe('3500');
    expect(s.native.received).toBe('500');
    expect(s.native.net).toBe('3000');
    expect(s.native.sentCount).toBe(2);
    expect(s.native.receivedCount).toBe(1);
  });

  it('counts internal transfers as native', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 100n, category: 'internal', direction: 'in', asset: 'ETH', decimals: 18 }),
      ]),
    );
    expect(s.native.received).toBe('100');
  });

  it('ignores self transfers', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 9999n, category: 'external', direction: 'self', asset: 'ETH', decimals: 18 }),
      ]),
    );
    expect(s.native.sent).toBe('0');
    expect(s.native.received).toBe('0');
    expect(s.native.sentCount).toBe(0);
    expect(s.native.receivedCount).toBe(0);
  });

  it('reports the largest in and out individually and overall', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 10n, category: 'external', direction: 'out', asset: 'ETH', decimals: 18 }),
        mkTransfer({ value: 100n, category: 'external', direction: 'out', asset: 'ETH', decimals: 18 }),
        mkTransfer({ value: 50n, category: 'external', direction: 'in', asset: 'ETH', decimals: 18 }),
        mkTransfer({ value: 75n, category: 'external', direction: 'in', asset: 'ETH', decimals: 18 }),
      ]),
    );
    expect(s.native.largestOut).toBe('100');
    expect(s.native.largestIn).toBe('75');
    expect(s.native.largestOverall).toBe('100');
  });
});

describe('analyzeMoney - tokens', () => {
  it('groups ERC-20 by contract and does not sum across tokens', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 100n, category: 'erc20', direction: 'out', asset: 'USDC', contractAddress: USDC, decimals: 6 }),
        mkTransfer({ value: 200n, category: 'erc20', direction: 'out', asset: 'USDC', contractAddress: USDC, decimals: 6 }),
        mkTransfer({ value: 5n, category: 'erc20', direction: 'out', asset: 'DAI', contractAddress: DAI, decimals: 18 }),
      ]),
    );
    expect(s.tokens).toHaveLength(2);
    const usdc = s.tokens.find((t) => t.contract === USDC)!;
    const dai = s.tokens.find((t) => t.contract === DAI)!;
    expect(usdc.totalOut).toBe('300');
    expect(usdc.transferCount).toBe(2);
    expect(dai.totalOut).toBe('5');
    expect(dai.transferCount).toBe(1);
  });

  it('computes totalNet as in minus out (signed)', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 1000n, category: 'erc20', direction: 'in', asset: 'USDC', contractAddress: USDC, decimals: 6 }),
        mkTransfer({ value: 400n, category: 'erc20', direction: 'out', asset: 'USDC', contractAddress: USDC, decimals: 6 }),
      ]),
    );
    const usdc = s.tokens[0]!;
    expect(usdc.totalNet).toBe('600');
  });

  it('picks mostUsedToken by transfer count, ties by address ascending', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 1n, category: 'erc20', direction: 'in', asset: 'USDC', contractAddress: USDC, decimals: 6 }),
        mkTransfer({ value: 1n, category: 'erc20', direction: 'in', asset: 'USDC', contractAddress: USDC, decimals: 6 }),
        mkTransfer({ value: 1n, category: 'erc20', direction: 'in', asset: 'WETH', contractAddress: WETH, decimals: 18 }),
      ]),
    );
    expect(s.mostUsedToken?.contract).toBe(USDC);
  });

  it('detects the most-used stablecoin by Base contract address', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 1n, category: 'erc20', direction: 'in', asset: 'WETH', contractAddress: WETH, decimals: 18 }),
        mkTransfer({ value: 1n, category: 'erc20', direction: 'in', asset: 'WETH', contractAddress: WETH, decimals: 18 }),
        mkTransfer({ value: 1n, category: 'erc20', direction: 'in', asset: 'USDC', contractAddress: USDC, decimals: 6 }),
      ]),
    );
    expect(s.mostUsedStablecoin?.contract).toBe(USDC);
  });

  it('returns null mostUsedStablecoin when no stablecoin was touched', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 1n, category: 'erc20', direction: 'in', asset: 'WETH', contractAddress: WETH, decimals: 18 }),
      ]),
    );
    expect(s.mostUsedStablecoin).toBeNull();
    expect(s.mostUsedToken?.contract).toBe(WETH);
  });
});

describe('analyzeMoney - USD', () => {
  it('never claims a USD valuation', () => {
    const s = analyzeMoney(
      activityWith([
        mkTransfer({ value: 1n, category: 'external', direction: 'out', asset: 'ETH', decimals: 18 }),
      ]),
    );
    expect(s.usdValuation).toBe('unavailable');
  });
});