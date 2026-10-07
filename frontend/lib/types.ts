/**
 * Types matching the Onchain Wrapped backend API contract.
 * Source of truth: Backend V1 specification.
 */

export type RangeOption = 'year' | 'last90' | 'last30' | 'all';

export type CardType = 'activity' | 'identity' | 'timing' | 'money' | 'addresses' | 'roast';

export type RoastSource = 'gemini' | 'fallback';

export interface IdentityData {
  name: string;
  score: number;
  traits: string[];
  rarity: string | null; // null in V1 - do not fabricate
}

export interface ActivityData {
  transactions: number;
  activeDays: number;
  busiestDay: string; // ISO date string e.g. "2026-08-14" or formatted month-day
}

export interface TimingData {
  busiestHour: number; // 0 - 23
  busiestDayOfWeek: string | number; // e.g. "Friday" or 5
  nightFraction: number; // e.g. 0.64
  lateNightFraction: number; // e.g. 0.42
}

export interface MoneyData {
  nativeSent: string; // decimal string
  nativeReceived: string; // decimal string
  topToken: string | null; // e.g. "USDC"
  usdValuation: 'unavailable' | string; // 'unavailable' in V1
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
  wallet: string; // Canonical checksummed address
  range: RangeOption;
  generatedAt: string; // ISO 8601 UTC
  identity: IdentityData;
  activity: ActivityData;
  timing: TimingData;
  money: MoneyData;
  addresses?: AddressesData; // Omitted when uniqueAddresses === 0
  roast: RoastData;
  cards: CardType[]; // Canonical render order
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
