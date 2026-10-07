import type { Wrapped } from '@/app/core/wrapped';

export type CompareCategoryId =
  | 'transactions'
  | 'activeDays'
  | 'uniqueAddresses'
  | 'activeStreak'
  | 'nightFraction'
  | 'nativeSent';

export type Winner = 'A' | 'B' | 'tie';

export type CompareCategory = {
  id: CompareCategoryId;
  label: string;
  aValue: number;
  bValue: number;
  winner: Winner;
  /** Absolute difference: |a - b|. */
  difference: number;
  /**
   * Ratio of larger to smaller, or null when either value is 0.
   * e.g. 3.2 means "the winner had 3.2x the loser".
   */
  ratio: number | null;
  /** One short deterministic sentence, never containing fabricated numbers. */
  summary: string;
};

export type CompareResult = {
  overall: Winner;
  aWins: number;
  bWins: number;
  ties: number;
  categories: CompareCategory[];
  summary: string[];
};

function cmp(a: number, b: number): Winner {
  if (a === b) return 'tie';
  return a > b ? 'A' : 'B';
}

function ratio(larger: number, smaller: number): number | null {
  if (smaller <= 0) return null;
  return Number((larger / smaller).toFixed(2));
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtPct(f: number): string {
  return `${(f * 100).toFixed(1)}%`;
}

function makeSummary(
  label: string,
  winner: Winner,
  aValue: number,
  bValue: number,
  aName: string,
  bName: string,
  ratioVal: number | null,
  isPct = false,
): string {
  if (winner === 'tie') {
    return `${aName} and ${bName} tied on ${label}.`;
  }
  const winnerName = winner === 'A' ? aName : bName;
  const loserName = winner === 'A' ? bName : aName;
  const wv = winner === 'A' ? aValue : bValue;

  if (ratioVal !== null && ratioVal >= 2) {
    return `${winnerName} ${label.toLowerCase().includes('sent') ? 'sent' : 'had'} ${ratioVal}x more than ${loserName} on ${label.toLowerCase()}.`;
  }
  const wvStr = isPct ? fmtPct(wv) : fmtInt(wv);
  return `${winnerName} led on ${label.toLowerCase()} with ${wvStr}.`;
}

function nativeSentWei(w: Wrapped): number {
  try {
    // Values can be large; convert to Number (safe for typical magnitudes).
    // For extremely large wallets we accept minor float imprecision in the
    // comparison only - the Wrapped object itself keeps the exact bigint-as-string.
    return Number(BigInt(w.money.native.sent));
  } catch {
    return 0;
  }
}

export function compare(a: Wrapped, b: Wrapped): CompareResult {
  const aName = shortName(a.wallet);
  const bName = shortName(b.wallet);

  const specs: Array<{
    id: CompareCategoryId;
    label: string;
    aValue: number;
    bValue: number;
    isPct?: boolean;
  }> = [
    {
      id: 'transactions',
      label: 'Transactions',
      aValue: a.stats.activity.totalTransactions,
      bValue: b.stats.activity.totalTransactions,
    },
    {
      id: 'activeDays',
      label: 'Active days',
      aValue: a.stats.activity.activeDays,
      bValue: b.stats.activity.activeDays,
    },
    {
      id: 'uniqueAddresses',
      label: 'Unique addresses',
      aValue: a.stats.contracts.uniqueAddresses,
      bValue: b.stats.contracts.uniqueAddresses,
    },
    {
      id: 'activeStreak',
      label: 'Longest active streak',
      aValue: a.stats.activity.longestActiveStreak,
      bValue: b.stats.activity.longestActiveStreak,
    },
    {
      id: 'nightFraction',
      label: 'Night activity',
      aValue: a.stats.timing.night.fraction,
      bValue: b.stats.timing.night.fraction,
      isPct: true,
    },
    {
      id: 'nativeSent',
      label: 'Native ETH sent (wei)',
      aValue: nativeSentWei(a),
      bValue: nativeSentWei(b),
    },
  ];

  const categories: CompareCategory[] = specs.map((s) => {
    const winner = cmp(s.aValue, s.bValue);
    const hi = Math.max(s.aValue, s.bValue);
    const lo = Math.min(s.aValue, s.bValue);
    return {
      id: s.id,
      label: s.label,
      aValue: s.aValue,
      bValue: s.bValue,
      winner,
      difference: Math.abs(s.aValue - s.bValue),
      ratio: ratio(hi, lo),
      summary: makeSummary(
        s.label,
        winner,
        s.aValue,
        s.bValue,
        aName,
        bName,
        ratio(hi, lo),
        s.isPct,
      ),
    };
  });

  const aWins = categories.filter((c) => c.winner === 'A').length;
  const bWins = categories.filter((c) => c.winner === 'B').length;
  const ties = categories.filter((c) => c.winner === 'tie').length;

  let overall: Winner = 'tie';
  if (aWins > bWins) overall = 'A';
  else if (bWins > aWins) overall = 'B';

  const overallSummary =
    overall === 'tie'
      ? `${aName} and ${bName} are evenly matched.`
      : `${overall === 'A' ? aName : bName} wins the head-to-head, ${Math.max(aWins, bWins)} categories to ${Math.min(aWins, bWins)}.`;

  return {
    overall,
    aWins,
    bWins,
    ties,
    categories,
    summary: [overallSummary, ...categories.map((c) => c.summary)],
  };
}

function shortName(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}