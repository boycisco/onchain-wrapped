import type { Activity } from '@/app/core/models';

/**
 * Timing analysis. ALL times are UTC.
 *
 * Day       : 06:00 - 17:59 UTC
 * Night     : 18:00 - 05:59 UTC
 * LateNight : 23:00 - 04:59 UTC   (subset of Night)
 * Weekday   : Mon - Fri (UTC)
 * Weekend   : Sat - Sun (UTC)
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0..Sat=6

export type TimingBucket<T> = {
  key: T;
  count: number;
  fraction: number; // 0..1 rounded to 4 decimals
};

export type TimingStats = {
  total: number; // transactions with usable timestamps
  byHour: TimingBucket<number>[];       // length 24
  byDayOfWeek: TimingBucket<DayOfWeek>[]; // length 7, Sun..Sat
  byMonth: TimingBucket<number>[];      // length 12, Jan..Dec
  busiestHour: TimingBucket<number> | null;
  busiestDayOfWeek: TimingBucket<DayOfWeek> | null;
  busiestMonth: TimingBucket<number> | null;
  day: TimingBucket<'day'>;
  night: TimingBucket<'night'>;
  lateNight: TimingBucket<'late'>;
  weekday: TimingBucket<'weekday'>;
  weekend: TimingBucket<'weekend'>;
};

const DAY_HOURS = new Set([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
const LATE_HOURS = new Set([23, 0, 1, 2, 3, 4]);

function bucket<T>(key: T, count: number, denom: number): TimingBucket<T> {
  const fraction = denom > 0 ? Number((count / denom).toFixed(4)) : 0;
  return { key, count, fraction };
}

/**
 * Deterministic tie-break: lower index wins (earlier hour / day / month).
 * This keeps busiestHour etc. stable when two buckets share the max count.
 */
function pickBusiest<T>(buckets: TimingBucket<T>[]): TimingBucket<T> | null {
  let best: TimingBucket<T> | null = null;
  for (const b of buckets) {
    if (best === null || b.count > best.count) {
      best = b;
    }
  }
  return best && best.count > 0 ? best : null;
}

export function analyzeTiming(activity: Activity): TimingStats {
  const times = activity.transactions
    .map((t) => t.timestamp)
    .filter((ts) => ts > 0);

  const total = times.length;

  const hourCounts = new Array(24).fill(0) as number[];
  const dowCounts = new Array(7).fill(0) as number[];
  const monthCounts = new Array(12).fill(0) as number[];

  let dayCount = 0;
  let nightCount = 0;
  let lateCount = 0;
  let weekdayCount = 0;
  let weekendCount = 0;

  for (const ts of times) {
    const d = new Date(ts * 1000);
    const h = d.getUTCHours();
    const dow = d.getUTCDay() as DayOfWeek;
    const m = d.getUTCMonth();

    hourCounts[h]!++;
    dowCounts[dow]!++;
    monthCounts[m]!++;

    if (DAY_HOURS.has(h)) dayCount++;
    else nightCount++;

    if (LATE_HOURS.has(h)) lateCount++;

    if (dow === 0 || dow === 6) weekendCount++;
    else weekdayCount++;
  }

  const byHour: TimingBucket<number>[] = hourCounts.map((c, i) =>
    bucket(i, c, total),
  );
  const byDayOfWeek: TimingBucket<DayOfWeek>[] = dowCounts.map((c, i) =>
    bucket(i as DayOfWeek, c, total),
  );
  const byMonth: TimingBucket<number>[] = monthCounts.map((c, i) =>
    bucket(i, c, total),
  );

  return {
    total,
    byHour,
    byDayOfWeek,
    byMonth,
    busiestHour: pickBusiest(byHour),
    busiestDayOfWeek: pickBusiest(byDayOfWeek),
    busiestMonth: pickBusiest(byMonth),
    day: bucket('day', dayCount, total),
    night: bucket('night', nightCount, total),
    lateNight: bucket('late', lateCount, total),
    weekday: bucket('weekday', weekdayCount, total),
    weekend: bucket('weekend', weekendCount, total),
  };
}