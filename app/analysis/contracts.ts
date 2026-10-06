import type { Activity, Address, Transaction } from '@/app/core/models';

/**
 * Address-interaction stats.
 *
 * IMPORTANT: this module counts every non-null `to` address on transactions
 * the wallet initiated, WITHOUT verifying whether the address is a smart
 * contract or a plain EOA. A later enrichment pass can classify these using
 * eth_getCode, but that costs one RPC call per unique address and is out of
 * scope for the deterministic analysis layer.
 *
 * Naming reflects this: `uniqueAddresses`, not `uniqueContracts`.
 */

export type AddressInteraction = {
  address: Address;
  interactions: number;
};

export type ContractStats = {
  /** Distinct non-null `to` addresses on transactions this wallet initiated. */
  uniqueAddresses: number;
  /** Top interactions, sorted by count desc then address asc. */
  topAddresses: AddressInteraction[];
  /** Fraction of "sent to address X" txs that went to the single top address. 0..1 */
  concentration: number;
  /** Fraction of the same txs that went to the top 10 addresses. 0..1 */
  topTenConcentration: number;
  /** Earliest `to` address on a sent tx, by block number, tie by address asc. */
  firstInteractedAddress: Address | null;
  /** Total sent transactions considered (denominator for the fractions above). */
  sentTransactions: number;
};

function sentToAddress(tx: Transaction): Address | null {
  if (!tx.to) return null;
  return tx.to;
}

export function analyzeContracts(activity: Activity): ContractStats {
  const counts = new Map<Address, number>();
  let sentTransactions = 0;

  // Deterministic tie-breaking requires stable input ordering. We sort first
  // by block number, then by hash, so "earliest" is unambiguous.
  const txs = [...activity.transactions].sort((a, b) => {
    if (a.blockNumber < b.blockNumber) return -1;
    if (a.blockNumber > b.blockNumber) return 1;
    return a.hash.localeCompare(b.hash);
  });

  let firstInteractedAddress: Address | null = null;

  for (const tx of txs) {
    const to = sentToAddress(tx);
    if (!to) continue;
    sentTransactions++;
    counts.set(to, (counts.get(to) ?? 0) + 1);
    if (firstInteractedAddress === null) {
      firstInteractedAddress = to;
    }
  }

  const entries: AddressInteraction[] = Array.from(counts.entries()).map(
    ([address, interactions]) => ({ address, interactions }),
  );

  entries.sort((a, b) => {
    if (b.interactions !== a.interactions) return b.interactions - a.interactions;
    return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
  });

  const denom = sentTransactions > 0 ? sentTransactions : 1;
  const concentration = sentTransactions > 0
    ? Number((entries[0]!.interactions / denom).toFixed(4))
    : 0;

  const topTen = entries.slice(0, 10);
  const topTenSum = topTen.reduce((sum, e) => sum + e.interactions, 0);
  const topTenConcentration = sentTransactions > 0
    ? Number((topTenSum / denom).toFixed(4))
    : 0;

  return {
    uniqueAddresses: entries.length,
    topAddresses: entries,
    concentration,
    topTenConcentration,
    firstInteractedAddress,
    sentTransactions,
  };
}