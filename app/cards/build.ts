import type { Wrapped } from '@/app/core/wrapped';
import type {
  ActivityCard,
  AddressesCard,
  Card,
  IdentityCard,
  MoneyCard,
  RoastCard,
  TimingCard,
} from './types';

/**
 * Build the deterministic card list from a Wrapped.
 * Same Wrapped -> same cards, always. No randomness, no network.
 */
export function buildCards(wrapped: Wrapped): Card[] {
  const cards: Card[] = [];

  cards.push(buildActivity(wrapped));
  cards.push(buildIdentity(wrapped));
  cards.push(buildTiming(wrapped));
  cards.push(buildMoney(wrapped));

  const addr = buildAddresses(wrapped);
  if (addr) cards.push(addr);

  cards.push(buildRoast(wrapped));

  return cards;
}

/* ------------------------------------------------------------------ */

function buildActivity(w: Wrapped): ActivityCard {
  const a = w.stats.activity;
  return {
    id: 'activity',
    type: 'activity',
    title: 'Your activity',
    transactions: a.totalTransactions,
    activeDays: a.activeDays,
    busiestDay: a.busiestDay,
  };
}

function buildIdentity(w: Wrapped): IdentityCard {
  return {
    id: 'identity',
    type: 'identity',
    title: 'Your identity',
    name: w.identity.name,
    score: w.identity.score,
    traits: w.identity.traits,
  };
}

function buildTiming(w: Wrapped): TimingCard {
  const t = w.stats.timing;
  return {
    id: 'timing',
    type: 'timing',
    title: 'When you were onchain',
    busiestHour: t.busiestHour ? t.busiestHour.key : null,
    busiestDayOfWeek: t.busiestDayOfWeek ? t.busiestDayOfWeek.key : null,
    nightFraction: t.night.fraction,
    lateNightFraction: t.lateNight.fraction,
  };
}

function buildMoney(w: Wrapped): MoneyCard {
  const m = w.money;
  const topToken = m.mostUsedToken
    ? {
        symbol: m.mostUsedToken.symbol,
        contract: m.mostUsedToken.contract,
        transferCount: m.mostUsedToken.transferCount,
      }
    : null;
  return {
    id: 'money',
    type: 'money',
    title: 'Your money moves',
    nativeSent: m.native.sent,
    nativeReceived: m.native.received,
    topToken,
  };
}

function buildAddresses(w: Wrapped): AddressesCard | null {
  const c = w.stats.contracts;
  if (c.uniqueAddresses === 0) return null;
  return {
    id: 'addresses',
    type: 'addresses',
    title: 'Your favorite addresses',
    uniqueAddresses: c.uniqueAddresses,
    top: c.topAddresses.slice(0, 5),
  };
}

function buildRoast(w: Wrapped): RoastCard {
  return {
    id: 'roast',
    type: 'roast',
    title: 'Your roast',
    lines: w.roast.lines,
  };
}