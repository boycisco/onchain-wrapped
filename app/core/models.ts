import type { Address } from 'viem';

export type { Address };

/** A closed time window, inclusive on both ends. Always UTC internally. */
export type Range = {
  start: Date;
  end: Date;
};

export type TransferCategory =
  | 'external'   // native ETH, top-level tx
  | 'internal'   // native ETH, contract-initiated
  | 'erc20'
  | 'erc721'
  | 'erc1155'
  | 'specialnft'
  | 'unknown';

export type Direction = 'in' | 'out' | 'self';

/**
 * A single asset movement involving the wallet.
 * `value` is a raw integer in the asset's smallest unit (wei for ETH,
 * 10^-decimals for ERC20). Presentation formatting happens later.
 */
export type Transfer = {
  hash: string;
  uniqueId: string;
  from: Address | null;
  to: Address | null;
  blockNumber: bigint;
  timestamp: number;            // unix seconds, UTC
  value: bigint;
  asset: string | null;         // e.g. 'ETH', 'USDC'
  contractAddress: Address | null;
  decimals: number | null;
  category: TransferCategory;
  direction: Direction;
};

/**
 * A unique on-chain transaction, grouped from one or more Transfers.
 * `status` is 'unknown' unless a separate enrichment pass sets it.
 */
export type Transaction = {
  hash: string;
  blockNumber: bigint;
  timestamp: number;
  from: Address | null;
  to: Address | null;
  transfers: Transfer[];
  status: 'success' | 'failed' | 'unknown';
};

/**
 * The whole result of the fetch+normalize stage for one wallet.
 * This is what the analysis layer consumes. It has no idea where it came from.
 */
export type Activity = {
  wallet: Address;
  range: Range;
  transfers: Transfer[];
  transactions: Transaction[];
};
