/**
 * Frontend types.
 *
 * Two groups:
 *   1. Backend*  - mirrors the real /api/wrapped and /api/compare contracts.
 *   2. Everything else - the shape the UI renders.
 *
 * The translation lives in lib/api.ts. Components never see Backend*.
 */

/* ----------------------------- frontend view types ---------------------------- */

export type RangeOption = 'year' | 'last90' | 'last30' | 'all';

export type CardType = 'activity' | 'identity' | 'timing' | 'money' | 'addresses' | 'roast';

export type RoastSource = 'gemini' | 'fallback';

export interface IdentityData {
  name: string;
  score: number;
  traits: string[];
  rarity: string | null;
}

export interface ActivityData {
  transactions: number;
  activeDays: number;
  busiestDay: string | null; // "YYYY-MM-DD" or null
}

export interface TimingData {
  busiestHour: number; // 0..23
  busiestDayOfWeek: number; // 0..6 (Sun..Sat)
  nightFraction: number; // 0..1
  lateNightFraction: number; // 0..1
}

export interface MoneyData {
  nativeSent: string; // ETH decimal string, e.g. "14.8520"
  nativeReceived: string;
  topToken: string | null;
  usdValuation: 'unavailable' | string;
}

export interface AddressInteraction {
  address: string;
  count: number;
  label?: string | null;
}

export interface AddressesData {
  uniqueAddresses: number;
  top: AddressInteraction[];
}

export interface RoastData {
  lines: string[];
  source: RoastSource;
}

export interface WrappedData {
  wallet: string;
  range: RangeOption;
  generatedAt: string;
  identity: IdentityData;
  activity: ActivityData;
  timing: TimingData;
  money: MoneyData;
  addresses?: AddressesData;
  roast: RoastData;
  cards: CardType[];
}

export interface WrappedResponse {
  wrapped: WrappedData;
  timings?: {
    totalMs: number;
    [key: string]: unknown;
  };
}

export interface ComparisonCategory {
  key: string;
  name: string;
  aValue: string;
  bValue: string;
  winner: 'a' | 'b' | 'tie';
  difference?: string;
  ratio?: string;
  summary?: string;
}

export interface ComparisonOverall {
  winner: 'a' | 'b' | 'tie';
  aWins: number;
  bWins: number;
  ties: number;
  headline?: string;
}

export interface WalletIdentityBrief {
  wallet: string;
  identity: {
    name: string;
    score: number;
  };
}

export interface ComparisonData {
  overall: ComparisonOverall;
  categories: ComparisonCategory[];
}

export interface CompareResponse {
  a: WalletIdentityBrief;
  b: WalletIdentityBrief;
  comparison: ComparisonData;
  timings?: {
    totalMs: number;
  };
  cached?: boolean;
}

export type ApiErrorCode =
  | 'INVALID_WALLET'
  | 'INVALID_RANGE'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'DATA_UNAVAILABLE'
  | 'CONFIG_ERROR'
  | 'ANALYSIS_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode | string;
    message: string;
  };
}

/* ----------------------------- backend wire types ----------------------------- */

export type BackendRange = { start: string; end: string };

export type BackendActivity = {
  totalTransactions: number;
  activeDays: number;
  busiestDay: { date: string; count: number } | null;
};

export type BackendTimingBucket = { key: number; count: number; fraction: number };

export type BackendTiming = {
  busiestHour: BackendTimingBucket | null;
  busiestDayOfWeek: BackendTimingBucket | null;
  night: { key: 'night'; count: number; fraction: number };
  lateNight: { key: 'late'; count: number; fraction: number };
};

export type BackendContracts = {
  uniqueAddresses: number;
  topAddresses: Array<{ address: string; interactions: number }>;
};

export type BackendMoney = {
  native: { sent: string; received: string };
  mostUsedToken: { symbol: string | null } | null;
  usdValuation: 'unavailable';
};

export type BackendIdentity = {
  name: string;
  score: number;
  rarity: null;
  traits: string[];
  matchedRuleIds: string[];
};

export type BackendRoast = {
  lines: string[];
  source: 'gemini' | 'fallback';
  fallbackReason?: string;
};

export type BackendCard = {
  id: CardType;
  type: CardType;
  title: string;
  [key: string]: unknown;
};

export type BackendWrapped = {
  schemaVersion: number;
  wallet: string;
  range: BackendRange;
  stats: {
    activity: BackendActivity;
    contracts: BackendContracts;
    timing: BackendTiming;
  };
  money: BackendMoney;
  identity: BackendIdentity;
  roast: BackendRoast;
  cards: BackendCard[];
  generatedAt: string;
};

export type BackendWrappedResponse = {
  wrapped: BackendWrapped;
  timings: { total: number; [k: string]: number };
};

export type BackendCompareCategory = {
  id: string;
  label: string;
  aValue: number;
  bValue: number;
  winner: 'A' | 'B' | 'tie';
  difference: number;
  ratio: number | null;
  summary: string;
};

export type BackendCompareResponse = {
  a: BackendWrapped;
  b: BackendWrapped;
  comparison: {
    overall: 'A' | 'B' | 'tie';
    aWins: number;
    bWins: number;
    ties: number;
    categories: BackendCompareCategory[];
    summary: string[];
  };
  timings: { total: number };
  cached: { a: boolean; b: boolean };
};