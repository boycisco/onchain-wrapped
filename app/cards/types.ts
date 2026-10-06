/**
 * Card data contract.
 *
 * Cards are DATA-ONLY. The frontend decides how to render them.
 * Every card carries a stable `id` and a human-readable `title`.
 * No colors, no layout hints, no visual semantics.
 */

export type ActivityCard = {
  id: 'activity';
  type: 'activity';
  title: string;
  transactions: number;
  activeDays: number;
  busiestDay: { date: string; count: number } | null;
};

export type IdentityCard = {
  id: 'identity';
  type: 'identity';
  title: string;
  name: string;
  score: number;
  traits: string[];
};

export type TimingCard = {
  id: 'timing';
  type: 'timing';
  title: string;
  busiestHour: number | null;        // 0..23 UTC
  busiestDayOfWeek: number | null;   // 0=Sun..6=Sat
  nightFraction: number;             // 0..1
  lateNightFraction: number;         // 0..1
};

export type MoneyCard = {
  id: 'money';
  type: 'money';
  title: string;
  nativeSent: string;                // wei, decimal string
  nativeReceived: string;            // wei, decimal string
  topToken: {
    symbol: string | null;
    contract: string | null;
    transferCount: number;
  } | null;
};

export type AddressesCard = {
  id: 'addresses';
  type: 'addresses';
  title: string;
  uniqueAddresses: number;
  top: Array<{ address: string; interactions: number }>;
};

export type RoastCard = {
  id: 'roast';
  type: 'roast';
  title: string;
  lines: string[];
};

export type Card =
  | ActivityCard
  | IdentityCard
  | TimingCard
  | MoneyCard
  | AddressesCard
  | RoastCard;