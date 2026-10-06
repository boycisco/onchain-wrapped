import type { Activity, Address, Transfer } from '@/app/core/models';

/**
 * Base mainnet stablecoin contracts, lowercase.
 * Kept tiny and explicit. Extending this list is a one-line change.
 * Source: Base mainnet, checked 2026-10.
 */
const STABLECOIN_CONTRACTS: ReadonlySet<string> = new Set([
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca', // USDbC
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // DAI
  '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', // USDT
  '0x368181499736d0c0cc614dbb53f8e97f9eefc9ba', // LUSD
]);

export type NativeSummary = {
  /** Sum of outgoing native transfers, in wei, as a decimal string. */
  sent: string;
  /** Sum of incoming native transfers, in wei, as a decimal string. */
  received: string;
  /** sent - received, signed, as a decimal string. */
  net: string;
  sentCount: number;
  receivedCount: number;
  /** Largest single outgoing native transfer, wei, decimal string. */
  largestOut: string | null;
  /** Largest single incoming native transfer, wei, decimal string. */
  largestIn: string | null;
  /** Largest of the two above (whichever is bigger). */
  largestOverall: string | null;
};

export type TokenSummary = {
  symbol: string | null;
  contract: Address | null;
  decimals: number | null;
  totalIn: string;
  totalOut: string;
  totalNet: string;
  inCount: number;
  outCount: number;
  transferCount: number;
  largestIn: string | null;
  largestOut: string | null;
};

export type MoneyStats = {
  native: NativeSummary;
  tokens: TokenSummary[];
  mostUsedStablecoin: TokenSummary | null;
  mostUsedToken: TokenSummary | null;
  totalTransfers: number;
  /**
   * Explicitly flagged because we do not have historical price data.
   * Do NOT assume this is zero USD. Downstream code must handle 'unavailable'.
   */
  usdValuation: 'unavailable';
};

function isNative(t: Transfer): boolean {
  return t.category === 'external' || t.category === 'internal';
}

function isFungibleToken(t: Transfer): boolean {
  return t.category === 'erc20';
}

function tokenKey(t: Transfer): string {
  if (t.contractAddress) return t.contractAddress.toLowerCase();
  return `symbol:${(t.asset ?? 'unknown').toLowerCase()}`;
}

function pickLargest(current: bigint | null, next: bigint): bigint {
  if (current === null) return next;
  return next > current ? next : current;
}

export function analyzeMoney(activity: Activity): MoneyStats {
  const transfers = activity.transfers;

  let sent = 0n;
  let received = 0n;
  let sentCount = 0;
  let receivedCount = 0;
  let largestOut: bigint | null = null;
  let largestIn: bigint | null = null;

  type TokenAcc = {
    symbol: string | null;
    contract: Address | null;
    decimals: number | null;
    totalIn: bigint;
    totalOut: bigint;
    inCount: number;
    outCount: number;
    largestIn: bigint | null;
    largestOut: bigint | null;
  };

  const tokenMap = new Map<string, TokenAcc>();

  for (const t of transfers) {
    if (isNative(t)) {
      if (t.direction === 'out') {
        sent += t.value;
        sentCount++;
        largestOut = pickLargest(largestOut, t.value);
      } else if (t.direction === 'in') {
        received += t.value;
        receivedCount++;
        largestIn = pickLargest(largestIn, t.value);
      }
      // 'self' native transfers do not count as sent or received.
      continue;
    }

    if (isFungibleToken(t)) {
      const key = tokenKey(t);
      const acc = tokenMap.get(key) ?? {
        symbol: t.asset,
        contract: t.contractAddress,
        decimals: t.decimals,
        totalIn: 0n,
        totalOut: 0n,
        inCount: 0,
        outCount: 0,
        largestIn: null,
        largestOut: null,
      };
      if (t.direction === 'out') {
        acc.totalOut += t.value;
        acc.outCount++;
        acc.largestOut = pickLargest(acc.largestOut, t.value);
      } else if (t.direction === 'in') {
        acc.totalIn += t.value;
        acc.inCount++;
        acc.largestIn = pickLargest(acc.largestIn, t.value);
      }
      tokenMap.set(key, acc);
    }
  }

  const tokens: TokenSummary[] = Array.from(tokenMap.entries())
    .map(([key, acc]) => ({
      key,
      summary: {
        symbol: acc.symbol,
        contract: acc.contract,
        decimals: acc.decimals,
        totalIn: acc.totalIn.toString(),
        totalOut: acc.totalOut.toString(),
        totalNet: (acc.totalIn - acc.totalOut).toString(),
        inCount: acc.inCount,
        outCount: acc.outCount,
        transferCount: acc.inCount + acc.outCount,
        largestIn: acc.largestIn === null ? null : acc.largestIn.toString(),
        largestOut: acc.largestOut === null ? null : acc.largestOut.toString(),
      } satisfies TokenSummary,
    }))
    // Stable order: most transfers desc, then contract/symbol key asc.
    .sort((a, b) => {
      const dc = b.summary.transferCount - a.summary.transferCount;
      if (dc !== 0) return dc;
      return a.key.localeCompare(b.key);
    })
    .map((x) => x.summary);

  const byCount = [...tokens].sort((a, b) => {
    const dc = b.transferCount - a.transferCount;
    if (dc !== 0) return dc;
    const ka = (a.contract ?? a.symbol ?? '').toLowerCase();
    const kb = (b.contract ?? b.symbol ?? '').toLowerCase();
    return ka.localeCompare(kb);
  });

  const mostUsedToken = byCount[0] ?? null;

  const stablecoins = byCount.filter((t) =>
    t.contract !== null &&
    STABLECOIN_CONTRACTS.has(t.contract.toLowerCase()),
  );
  const mostUsedStablecoin = stablecoins[0] ?? null;

  const largestOverall =
    largestOut === null && largestIn === null
      ? null
      : (largestOut ?? 0n) > (largestIn ?? 0n)
        ? (largestOut as bigint)
        : (largestIn as bigint);

  return {
    native: {
      sent: sent.toString(),
      received: received.toString(),
      net: (sent - received).toString(),
      sentCount,
      receivedCount,
      largestOut: largestOut === null ? null : largestOut.toString(),
      largestIn: largestIn === null ? null : largestIn.toString(),
      largestOverall: largestOverall === null ? null : largestOverall.toString(),
    },
    tokens,
    mostUsedStablecoin,
    mostUsedToken,
    totalTransfers: transfers.length,
    usdValuation: 'unavailable',
  };
}