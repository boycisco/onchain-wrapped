import type { Address, Activity, Range, Transaction, Transfer } from '@/app/core/models';

export const WALLET = '0x1234567890abcdef1234567890abcdef12345678' as Address;

/** A range of `days` ending at a fixed default `now`, for deterministic tests. */
export function makeRange(
  days = 365,
  now: Date = new Date('2026-08-15T00:00:00Z'),
): Range {
  return {
    start: new Date(now.getTime() - days * 86_400_000),
    end: now,
  };
}

/** Unix seconds for `YYYY-MM-DD` at UTC `hour:minute`. Default 12:00 UTC. */
export function at(date: string, hour = 12, minute = 0): number {
  return Math.floor(
    Date.parse(
      `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
    ) / 1000,
  );
}

/** Minimal Transaction with a single dummy transfer. */
export function tx(
  hash: string,
  ts: number,
  status: Transaction['status'] = 'unknown',
): Transaction {
  const t: Transfer = {
    hash,
    uniqueId: `${hash}:external`,
    from: WALLET,
    to: null,
    blockNumber: BigInt(Math.max(1, Math.floor(ts / 12))),
    timestamp: ts,
    value: 0n,
    asset: 'ETH',
    contractAddress: null,
    decimals: 18,
    category: 'external',
    direction: 'out',
  };
  return {
    hash,
    blockNumber: t.blockNumber,
    timestamp: ts,
    from: WALLET,
    to: null,
    transfers: [t],
    status,
  };
}

/** Wrap a list of transactions into an Activity. */
export function makeActivity(txs: Transaction[], range = makeRange()): Activity {
  return {
    wallet: WALLET,
    range,
    transfers: txs.flatMap((t) => t.transfers),
    transactions: txs,
  };
}

/** Shortcut: N txs on a given YYYY-MM-DD, with stable distinct hashes. */
export function txsOnDay(
  date: string,
  count: number,
  hour = 12,
  status: Transaction['status'] = 'unknown',
): Transaction[] {
  const out: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const h = (hour + Math.floor(i / 60)) % 24;
    const m = i % 60;
    const hash = `0x${date.replace(/-/g, '')}${String(i).padStart(4, '0')}${'0'.repeat(56)}`.slice(0, 66);
    out.push(tx(hash, at(date, h, m), status));
  }
  return out;
}