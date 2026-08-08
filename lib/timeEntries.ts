import { splitByDay, spanMinutes, type DaySlice } from "./time";
import type { TimeEntry } from "./types";

/**
 * Aggregation over interval-shaped time entries.
 *
 * Everything here routes through splitByDay so a cross-midnight entry is
 * counted against both days it touches, and nothing has to trust a stored
 * per-day total that a later edit could invalidate.
 */

export type TimeSpan = Pick<TimeEntry, "id" | "category" | "started_at" | "ended_at">;

export function isRunning(entry: TimeSpan): boolean {
  return entry.ended_at === null;
}

/**
 * Where the interval currently ends: its recorded end, or now while running.
 * A timer whose offset start is still in the future ends before it begins,
 * which splitByDay correctly reports as no time at all.
 */
export function effectiveEnd(entry: TimeSpan, now: Date): Date {
  return entry.ended_at ? new Date(entry.ended_at) : now;
}

export function slicesFor(entry: TimeSpan, timeZone: string, now: Date): DaySlice[] {
  return splitByDay(new Date(entry.started_at), effectiveEnd(entry, now), timeZone);
}

/** Minutes of one entry that fall on one local day. */
export function minutesOnDay(
  entry: TimeSpan,
  dateISO: string,
  timeZone: string,
  now: Date,
): number {
  const slice = slicesFor(entry, timeZone, now).find((s) => s.date === dateISO);
  return slice ? slice.minutes : 0;
}

/** Total duration of an entry so far, across all days. */
export function entryMinutes(entry: TimeSpan, now: Date): number {
  return spanMinutes(new Date(entry.started_at), effectiveEnd(entry, now));
}

/**
 * date -> category -> minutes, for every day the given entries touch.
 * Used by both the Today card and the history chart, so the two can't drift.
 */
export function totalsByDay(
  entries: TimeSpan[],
  timeZone: string,
  now: Date,
): Map<string, Record<string, number>> {
  const byDay = new Map<string, Record<string, number>>();
  for (const entry of entries) {
    for (const slice of slicesFor(entry, timeZone, now)) {
      const day = byDay.get(slice.date) ?? {};
      day[entry.category] = (day[entry.category] ?? 0) + slice.minutes;
      byDay.set(slice.date, day);
    }
  }
  return byDay;
}

/** Category totals for a single local day. */
export function totalsOnDay(
  entries: TimeSpan[],
  dateISO: string,
  timeZone: string,
  now: Date,
): Record<string, number> {
  return totalsByDay(entries, timeZone, now).get(dateISO) ?? {};
}

/**
 * Entries that overlap a local day, for display. Mirrors the SQL predicate:
 *   started_at < day_end and (ended_at is null or ended_at > day_start)
 */
export function overlapsDay(entry: TimeSpan, dayStart: Date, dayEnd: Date): boolean {
  const started = new Date(entry.started_at).getTime();
  if (started >= dayEnd.getTime()) return false;
  if (entry.ended_at === null) return true;
  return new Date(entry.ended_at).getTime() > dayStart.getTime();
}
