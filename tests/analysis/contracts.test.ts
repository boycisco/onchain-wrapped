import { describe, it, expect } from 'vitest';
import { analyzeContracts } from '@/app/analysis/contracts';
import type {
  Activity,
  Address,
  Transaction,
  Transfer,
} from '@/app/core/models';
import { WALLET, makeRange } from '../fixtures/build';

const A1 = '0x1111111111111111111111111111111111111111' as Address;
const A2 = '0x2222222222222222222222222222222222222222' as Address;
const A3 = '0x3333333333333333333333333333333333333333' as Address;

let nonce = 0;
function mkTx(
  to: Address | null,
  blockNumber: number,
  from: Address = WALLET,
): Transaction {
  nonce++;
  const hash = `0x${String(nonce).padStart(64, '0')}`;
  const transfer: Transfer = {
    hash,
    uniqueId: `${hash}:t`,
    from,
    to,
    blockNumber: BigInt(blockNumber),
    timestamp: 1_700_000_000 + blockNumber,
    value: 1n,
    asset: 'ETH',
    contractAddress: null,
    decimals: 18,
    category: 'external',
    direction: to?.toLowerCase() === from.toLowerCase() ? 'self' : 'out',
  };
  return {
    hash,
    blockNumber: BigInt(blockNumber),
    timestamp: transfer.timestamp,
    from,
    to,
    transfers: [transfer],
    status: 'unknown',
  };
}

function activityWith(txs: Transaction[]): Activity {
  return {
    wallet: WALLET,
    range: makeRange(),
    transfers: txs.flatMap((t) => t.transfers),
    transactions: txs,
  };
}

describe('analyzeContracts - empty', () => {
  it('returns zeros and nulls', () => {
    const s = analyzeContracts(activityWith([]));
    expect(s.uniqueAddresses).toBe(0);
    expect(s.topAddresses).toEqual([]);
    expect(s.concentration).toBe(0);
    expect(s.topTenConcentration).toBe(0);
    expect(s.firstInteractedAddress).toBeNull();
    expect(s.sentTransactions).toBe(0);
  });
});

describe('analyzeContracts - counting', () => {
  it('counts unique non-null `to` addresses', () => {
    const s = analyzeContracts(activityWith([
      mkTx(A1, 1),
      mkTx(A1, 2),
      mkTx(A2, 3),
    ]));
    expect(s.uniqueAddresses).toBe(2);
    expect(s.sentTransactions).toBe(3);
  });

  it('skips transactions with null `to` (contract creations)', () => {
    const s = analyzeContracts(activityWith([
      mkTx(A1, 1),
      mkTx(null, 2),
      mkTx(A2, 3),
    ]));
    expect(s.uniqueAddresses).toBe(2);
    expect(s.sentTransactions).toBe(2);
  });
});

describe('analyzeContracts - ranking', () => {
  it('sorts by interactions desc, then address asc', () => {
    const s = analyzeContracts(activityWith([
      mkTx(A2, 1),
      mkTx(A1, 2),
      mkTx(A1, 3),
      mkTx(A3, 4),
      mkTx(A2, 5),
      mkTx(A1, 6),
    ]));
    expect(s.topAddresses.map((e) => e.address)).toEqual([A1, A2, A3]);
    expect(s.topAddresses.map((e) => e.interactions)).toEqual([3, 2, 1]);
  });

  it('breaks exact ties by address ascending', () => {
    const s = analyzeContracts(activityWith([
      mkTx(A3, 1),
      mkTx(A1, 2),
      mkTx(A2, 3),
    ]));
    expect(s.topAddresses.map((e) => e.address)).toEqual([A1, A2, A3]);
  });
});

describe('analyzeContracts - concentration', () => {
  it('computes top-1 concentration as fraction of sent txs', () => {
    const s = analyzeContracts(activityWith([
      mkTx(A1, 1),
      mkTx(A1, 2),
      mkTx(A1, 3),
      mkTx(A2, 4),
    ]));
    // 3 of 4 txs to A1
    expect(s.concentration).toBe(0.75);
  });

  it('caps topTenConcentration at 1 when there are <= 10 addresses', () => {
    const s = analyzeContracts(activityWith([
      mkTx(A1, 1),
      mkTx(A2, 2),
    ]));
    expect(s.topTenConcentration).toBe(1);
  });
});

describe('analyzeContracts - first interaction', () => {
  it('reports the earliest `to` address by block number', () => {
    const s = analyzeContracts(activityWith([
      mkTx(A2, 5),
      mkTx(A1, 2), // earlier block
      mkTx(A3, 9),
    ]));
    expect(s.firstInteractedAddress).toBe(A1);
  });

  it('breaks ties on block number by hash ascending (deterministic)', () => {
    // Two txs at block 5. Our fixture builder increments nonce, so hashes are
    // ordered by creation. Sorting ascending picks the first-created one.
    const t1 = mkTx(A2, 5); // created first -> lower hash
    const t2 = mkTx(A1, 5); // created second
    const s = analyzeContracts(activityWith([t2, t1]));
    expect(s.firstInteractedAddress).toBe(A2);
  });
});