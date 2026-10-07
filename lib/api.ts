import {
  ApiErrorCode,
  ApiErrorPayload,
  BackendCompareCategory,
  BackendCompareResponse,
  BackendWrapped,
  BackendWrappedResponse,
  CompareResponse,
  ComparisonCategory,
  RangeOption,
  WrappedData,
  WrappedResponse,
} from './types';

export class WrappedApiError extends Error {
  code: ApiErrorCode | string;

  constructor(message: string, code: ApiErrorCode | string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'WrappedApiError';
    this.code = code;
  }
}

/* ----------------------------- public API ----------------------------- */

export async function getWrapped(
  wallet: string,
  range: RangeOption = 'year'
): Promise<WrappedResponse> {
  const cleanWallet = wallet.trim();

  if (!cleanWallet.startsWith('0x') || cleanWallet.length !== 42) {
    throw new WrappedApiError('Invalid Base wallet address.', 'INVALID_WALLET');
  }

  const res = await fetch('/api/wrapped', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: cleanWallet, range }),
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  const backend = (await res.json()) as BackendWrappedResponse;
  return {
    wrapped: adaptWrapped(backend.wrapped, range),
    timings: { totalMs: backend.timings.total },
  };
}

export async function compareWallets(
  wallet: string,
  other: string,
  range: RangeOption = 'year'
): Promise<CompareResponse> {
  const cleanWallet = wallet.trim();
  const cleanOther = other.trim();

  if (!cleanWallet.startsWith('0x') || cleanWallet.length !== 42) {
    throw new WrappedApiError('Your Base wallet address is invalid.', 'INVALID_WALLET');
  }
  if (!cleanOther.startsWith('0x') || cleanOther.length !== 42) {
    throw new WrappedApiError('Comparison wallet address is invalid.', 'INVALID_WALLET');
  }

  const res = await fetch('/api/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: cleanWallet, other: cleanOther, range }),
  });

  if (!res.ok) {
    throw await toApiError(res);
  }

  const backend = (await res.json()) as BackendCompareResponse;
  return adaptCompare(backend);
}

/* ----------------------------- error handling ----------------------------- */

async function toApiError(res: Response): Promise<WrappedApiError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await res.json()) as ApiErrorPayload;
  } catch {
    /* not JSON */
  }
  if (payload?.error) {
    return new WrappedApiError(
      payload.error.message || 'Request failed',
      payload.error.code || 'INTERNAL_ERROR'
    );
  }
  return new WrappedApiError(`Request failed with status ${res.status}`, 'INTERNAL_ERROR');
}

/* ----------------------------- adapters ----------------------------- */

function adaptWrapped(backend: BackendWrapped, requestedRange: RangeOption): WrappedData {
  const a = backend.stats.activity;
  const t = backend.stats.timing;
  const c = backend.stats.contracts;
  const m = backend.money;

  const addresses: WrappedData['addresses'] =
    c.uniqueAddresses > 0
      ? {
          uniqueAddresses: c.uniqueAddresses,
          top: c.topAddresses.slice(0, 5).map((entry) => ({
            address: entry.address,
            count: entry.interactions,
            label: null,
          })),
        }
      : undefined;

  return {
    wallet: backend.wallet,
    range: requestedRange,
    generatedAt: backend.generatedAt,
    identity: {
      name: backend.identity.name,
      score: backend.identity.score,
      traits: backend.identity.traits,
      rarity: null,
    },
    activity: {
      transactions: a.totalTransactions,
      activeDays: a.activeDays,
      busiestDay: a.busiestDay ? a.busiestDay.date : null,
    },
    timing: {
      busiestHour: t.busiestHour ? t.busiestHour.key : 0,
      busiestDayOfWeek: t.busiestDayOfWeek ? t.busiestDayOfWeek.key : 0,
      nightFraction: t.night.fraction,
      lateNightFraction: t.lateNight.fraction,
    },
    money: {
      nativeSent: weiToEthString(m.native.sent),
      nativeReceived: weiToEthString(m.native.received),
      topToken: m.mostUsedToken?.symbol ?? null,
      usdValuation: m.usdValuation,
    },
    addresses,
    roast: {
      lines: backend.roast.lines,
      source: backend.roast.source,
    },
    cards: backend.cards.map((card) => card.id),
  };
}

function adaptCompare(backend: BackendCompareResponse): CompareResponse {
  return {
    a: {
      wallet: backend.a.wallet,
      identity: {
        name: backend.a.identity.name,
        score: backend.a.identity.score,
      },
    },
    b: {
      wallet: backend.b.wallet,
      identity: {
        name: backend.b.identity.name,
        score: backend.b.identity.score,
      },
    },
    comparison: {
      overall: {
        winner: lowerWinner(backend.comparison.overall),
        aWins: backend.comparison.aWins,
        bWins: backend.comparison.bWins,
        ties: backend.comparison.ties,
        headline: backend.comparison.summary[0],
      },
      categories: backend.comparison.categories.map((cat) =>
        adaptCategory(cat, backend)
      ),
    },
    timings: { totalMs: backend.timings.total },
    cached: backend.cached.a && backend.cached.b,
  };
}

function adaptCategory(
  cat: BackendCompareCategory,
  backend: BackendCompareResponse
): ComparisonCategory {
  let aValue: string;
  let bValue: string;

  if (cat.id === 'nativeSent') {
    aValue = `${weiToEthString(backend.a.money.native.sent)} ETH`;
    bValue = `${weiToEthString(backend.b.money.native.sent)} ETH`;
  } else if (cat.id === 'nightFraction') {
    aValue = formatPercent(cat.aValue);
    bValue = formatPercent(cat.bValue);
  } else {
    aValue = formatInt(cat.aValue);
    bValue = formatInt(cat.bValue);
  }

  const winner = lowerWinner(cat.winner);

  const diffSign = winner === 'a' ? '+' : winner === 'b' ? '-' : '';
  const difference =
    cat.difference === 0 ? '0' : `${diffSign}${formatInt(cat.difference)}`;

  const ratio = cat.ratio !== null ? `${cat.ratio.toFixed(2)}x` : undefined;

  return {
    key: cat.id,
    name: cat.label,
    aValue,
    bValue,
    winner,
    difference,
    ratio,
    summary: cat.summary,
  };
}

function lowerWinner(w: 'A' | 'B' | 'tie'): 'a' | 'b' | 'tie' {
  if (w === 'A') return 'a';
  if (w === 'B') return 'b';
  return 'tie';
}

/* ----------------------------- formatting helpers ----------------------------- */

function formatInt(n: number): string {
  return n.toLocaleString('en-US');
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/**
 * Convert a wei decimal string to an ETH decimal string, without floats.
 * Trims trailing zeros but keeps at least 2 decimals for readability.
 */
function weiToEthString(wei: string): string {
  let n: bigint;
  try {
    n = BigInt(wei);
  } catch {
    return '0.00';
  }
  const divisor = 10n ** 18n;
  const whole = n / divisor;
  const frac = n % divisor;
  const fracFull = frac.toString().padStart(18, '0');
  const fracTrimmed = fracFull.slice(0, 4).replace(/0+$/, '') || '00';
  return `${whole.toString()}.${fracTrimmed.padEnd(2, '0')}`;
}