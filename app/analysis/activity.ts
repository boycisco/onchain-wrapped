import type { Activity } from '@/app/core/models';

const DAY_SEC = 86_400;

export type DayKey = string;   // "YYYY-MM-DD" (UTC)
export type MonthKey = string; // "YYYY-MM" (UTC)

export type ActivityStats = {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  unknownTransactions: number;
  activeDays: number;
  inactiveDays: number;
  spanDays: number;
  firstActivity: string | null; // ISO 8601 UTC
  lastActivity: string | null;  // ISO 8601 UTC
  longestActiveStreak: number;
  longestInactiveStreak: number;
  transactionsPerActiveDay: number;
  busiestDay: { date: DayKey; count: number } | null;
  busiestMonth: { month: MonthKey; count: number } | null;
};

function dayKey(ts: number): DayKey {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function monthKey(ts: number): MonthKey {
  return new Date(ts * 1000).toISOString().slice(0, 7);
}

function startOfUtcDay(ts: number): number {
  const d = new Date(ts * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
}

function longestRunOfConsecutive(sortedDays: number[]): number {
  if (sortedDays.length === 0) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i]! - sortedDays[i - 1]! === DAY_SEC) cur++;
    else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

function longestGap(sortedDays: number[]): number {
  if (sortedDays.length < 2) return 0;
  let best = 0;
  for (let i = 1; i < sortedDays.length; i++) {
    const gap = (sortedDays[i]! - sortedDays[i - 1]!) / DAY_SEC - 1;
    if (gap > best) best = gap;
  }
  return best;
}

/**
 * Compute deterministic activity statistics from a normalized Activity.
 * Pure function. No provider access. No I/O. Same input -> same output.
 */
export function analyzeActivity(activity: Activity): ActivityStats {
  const txs = activity.transactions;
  const total = txs.length;

  let successful = 0;
  let failed = 0;
  let unknown = 0;
  for (const t of txs) {
    if (t.status === 'success') successful++;
    else if (t.status === 'failed') failed++;
    else unknown++;
  }

  // Only trust transactions with a usable timestamp.
  const timedTxs = txs.filter((t) => t.timestamp > 0);
  const times = timedTxs.map((t) => t.timestamp).sort((a, b) => a - b);

  const firstActivity = times.length > 0 ? new Date(times[0]! * 1000).toISOString() : null;
  const lastActivity = times.length > 0
    ? new Date(times[times.length - 1]! * 1000).toISOString()
    : null;

  const daySet = new Set<number>();
  const dayCounts = new Map<DayKey, number>();
  const monthCounts = new Map<MonthKey, number>();

  for (const t of timedTxs) {
    daySet.add(startOfUtcDay(t.timestamp));
    const dk = dayKey(t.timestamp);
    dayCounts.set(dk, (dayCounts.get(dk) ?? 0) + 1);
    const mk = monthKey(t.timestamp);
    monthCounts.set(mk, (monthCounts.get(mk) ?? 0) + 1);
  }

  const uniqueDays = Array.from(daySet).sort((a, b) => a - b);
  const activeDays = uniqueDays.length;

  const spanDays = uniqueDays.length > 0
    ? Math.floor((uniqueDays[uniqueDays.length - 1]! - uniqueDays[0]!) / DAY_SEC) + 1
    : 0;
  const inactiveDays = spanDays - activeDays;

  const longestActiveStreak = longestRunOfConsecutive(uniqueDays);
  const longestInactiveStreak = longestGap(uniqueDays);

  const transactionsPerActiveDay = activeDays > 0
    ? Number((total / activeDays).toFixed(2))
    : 0;

  // Busiest day: highest count wins, earliest date breaks ties.
  let busiestDay: ActivityStats['busiestDay'] = null;
  for (const [date, count] of dayCounts) {
    if (
      busiestDay === null ||
      count > busiestDay.count ||
      (count === busiestDay.count && date < busiestDay.date)
    ) {
      busiestDay = { date, count };
    }
  }

  // Busiest month: same rule.
  let busiestMonth: ActivityStats['busiestMonth'] = null;
  for (const [month, count] of monthCounts) {
    if (
      busiestMonth === null ||
      count > busiestMonth.count ||
      (count === busiestMonth.count && month < busiestMonth.month)
    ) {
      busiestMonth = { month, count };
    }
  }

  return {
    totalTransactions: total,
    successfulTransactions: successful,
    failedTransactions: failed,
    unknownTransactions: unknown,
    activeDays,
    inactiveDays,
    spanDays,
    firstActivity,
    lastActivity,
    longestActiveStreak,
    longestInactiveStreak,
    transactionsPerActiveDay,
    busiestDay,
    busiestMonth,
  };
}