import { getAddress, isAddress } from 'viem';
import type {
  Address,
  Transfer,
  TransferCategory,
  Direction,
  Transaction,
} from '@/app/core/models';

/* ---------- Raw Alchemy shapes (only what we read) ---------- */

export type AlchemyRawTransfer = {
  blockNum: string;
  hash: string;
  uniqueId?: string | null;
  from: string | null;
  to: string | null;
  value: number | null;
  erc721TokenId?: string | null;
  erc1155Metadata?: { tokenId: string; value: string }[] | null;
  tokenId?: string | null;
  asset: string | null;
  category: string;
  rawContract: {
    value: string | null;
    address: string | null;
    decimal: string | null;
  };
  metadata: { blockTimestamp: string } | null;
};

export type AlchemyRawResponse = {
  transfers: AlchemyRawTransfer[] | null;
  pageKey?: string | null;
};

/* ---------- Helpers ---------- */

function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex) return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

function hexToNumber(hex: string | null | undefined): number | null {
  if (!hex) return null;
  try {
    return Number(BigInt(hex));
  } catch {
    return null;
  }
}

function safeAddress(input: string | null | undefined): Address | null {
  if (!input) return null;
  if (!isAddress(input)) return null;
  return getAddress(input);
}

function isoToUnix(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 0;
  return Math.floor(ms / 1000);
}

function toCategory(raw: string): TransferCategory {
  switch (raw) {
    case 'external':
    case 'internal':
    case 'erc20':
    case 'erc721':
    case 'erc1155':
    case 'specialnft':
      return raw;
    default:
      return 'unknown';
  }
}

function pickValue(raw: AlchemyRawTransfer, category: TransferCategory): bigint {
  if (category === 'erc721') return 1n;
  if (category === 'erc1155') {
    const meta = raw.erc1155Metadata?.[0];
    if (meta?.value) {
      try { return BigInt(meta.value); } catch { return 1n; }
    }
    return 1n;
  }
  return hexToBigInt(raw.rawContract.value);
}

function pickDecimals(raw: AlchemyRawTransfer, category: TransferCategory): number | null {
  if (category === 'external' || category === 'internal') return 18;
  if (category === 'erc721' || category === 'erc1155') return 0;
  return hexToNumber(raw.rawContract.decimal);
}

function pickAsset(raw: AlchemyRawTransfer, category: TransferCategory): string | null {
  if (category === 'external' || category === 'internal') return 'ETH';
  return raw.asset ?? null;
}

function pickContract(raw: AlchemyRawTransfer, category: TransferCategory): Address | null {
  if (category === 'external' || category === 'internal') return null;
  return safeAddress(raw.rawContract.address);
}

function inferDirection(
  wallet: Address,
  from: Address | null,
  to: Address | null,
): Direction {
  const isFrom = from !== null && from.toLowerCase() === wallet.toLowerCase();
  const isTo = to !== null && to.toLowerCase() === wallet.toLowerCase();
  if (isFrom && isTo) return 'self';
  if (isFrom) return 'out';
  if (isTo) return 'in';
  // Alchemy can return entries where the wallet is neither 'from' nor 'to' for
  // some internal traces; treat them as incoming by convention and let higher
  // layers filter if needed.
  return 'in';
}

/* ---------- Public API ---------- */

export function normalizeTransfer(
  raw: AlchemyRawTransfer,
  wallet: Address,
): Transfer | null {
  if (!raw.hash) return null;
  const category = toCategory(raw.category);
  const from = safeAddress(raw.from);
  const to = safeAddress(raw.to);
  const value = pickValue(raw, category);
  const decimals = pickDecimals(raw, category);
  const asset = pickAsset(raw, category);
  const contractAddress = pickContract(raw, category);

  const uniqueId =
    raw.uniqueId ??
    `${raw.hash}:${raw.category}:${raw.erc721TokenId ?? raw.tokenId ?? '0'}`;

  return {
    hash: raw.hash,
    uniqueId,
    from,
    to,
    blockNumber: hexToBigInt(raw.blockNum),
    timestamp: isoToUnix(raw.metadata?.blockTimestamp ?? null),
    value,
    asset,
    contractAddress,
    decimals,
    category,
    direction: inferDirection(wallet, from, to),
  };
}

export function normalizeTransfers(
  rawList: AlchemyRawTransfer[],
  wallet: Address,
): Transfer[] {
  const out: Transfer[] = [];
  const seen = new Set<string>();
  for (const raw of rawList) {
    const t = normalizeTransfer(raw, wallet);
    if (!t) continue;
    if (seen.has(t.uniqueId)) continue;
    seen.add(t.uniqueId);
    out.push(t);
  }
  return out;
}

/**
 * Group normalized transfers into unique transactions by hash.
 * Order within a transaction is preserved; transactions are sorted ascending
 * by block number, then by hash for stable determinism.
 */
export function groupTransactions(transfers: Transfer[]): Transaction[] {
  const groups = new Map<string, Transfer[]>();
  for (const t of transfers) {
    const arr = groups.get(t.hash);
    if (arr) arr.push(t);
    else groups.set(t.hash, [t]);
  }

  const txs: Transaction[] = [];
  for (const [hash, list] of groups) {
    const head = list[0]!;
    // Prefer the external transfer's from/to if present; otherwise use the head.
    const external = list.find((t) => t.category === 'external') ?? head;
    txs.push({
      hash,
      blockNumber: head.blockNumber,
      timestamp: head.timestamp,
      from: external.from,
      to: external.to,
      transfers: list,
      status: 'unknown',
    });
  }

  txs.sort((a, b) => {
    if (a.blockNumber < b.blockNumber) return -1;
    if (a.blockNumber > b.blockNumber) return 1;
    return a.hash.localeCompare(b.hash);
  });

  return txs;
}
