"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Chart density: measure the plot, derive a point budget, aggregate past it.
 *
 * The trigger is how many points a series actually has, not which range button
 * is selected — that's the difference that keeps 90 days of exercise (a dozen
 * sessions) rendering exactly while 90 days of calories gets condensed.
 */

// Minimum horizontal room a mark needs before it stops being readable.
export const PX_PER_BAR = 9;
export const PX_PER_DOT = 14;

// Dots turn into noise well before the point budget runs out.
export const DOT_LIMIT = 22;

// Recharts' Y axis + our left margin, excluded from the usable plot width.
const AXIS_PX = 46;

// Bucket widths a person can reason about. ceil(n / max) would happily produce
// 4- or 5-day buckets, which nobody can read off an axis.
const NICE_BUCKETS = [1, 2, 3, 7, 14, 30] as const;

export function bucketSizeFor(n: number, maxPoints: number): number {
  if (maxPoints <= 0) return 1;
  for (const size of NICE_BUCKETS) {
    if (Math.ceil(n / size) <= maxPoints) return size;
  }
  return NICE_BUCKETS[NICE_BUCKETS.length - 1];
}

/** Watches a container and returns how many marks fit inside it. */
export function useMaxPoints(pxPerPoint: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plot = width - AXIS_PX;
  // Before the first measurement, assume a phone rather than a desktop so the
  // first paint is never denser than the device can show.
  const maxPoints = plot > 0 ? Math.max(4, Math.floor(plot / pxPerPoint)) : 28;
  return { ref, maxPoints, measured: width > 0 };
}

export type Bucket<T> = {
  /** Days that fell in this bucket, oldest first. */
  days: T[];
  /** Date of the last day, used as the point's x value. */
  date: string;
  startDate: string;
  endDate: string;
  size: number;
};

/**
 * Groups consecutive days into fixed-width buckets, aligned to the END of the
 * range so the most recent bucket is always whole and today never straddles a
 * boundary. Any short bucket is therefore the oldest one.
 */
export function bucketDays<T extends { date: string }>(rows: T[], size: number): Bucket<T>[] {
  if (size <= 1) {
    return rows.map((r) => ({
      days: [r],
      date: r.date,
      startDate: r.date,
      endDate: r.date,
      size: 1,
    }));
  }
  const out: Bucket<T>[] = [];
  const lead = rows.length % size;
  let i = 0;
  if (lead > 0) {
    const days = rows.slice(0, lead);
    out.push({
      days,
      date: days[days.length - 1].date,
      startDate: days[0].date,
      endDate: days[days.length - 1].date,
      size: lead,
    });
    i = lead;
  }
  for (; i + size <= rows.length; i += size) {
    const days = rows.slice(i, i + size);
    out.push({
      days,
      date: days[days.length - 1].date,
      startDate: days[0].date,
      endDate: days[days.length - 1].date,
      size,
    });
  }
  return out;
}

/**
 * Mean of `value` across the days in a bucket that have any data.
 *
 * Averaging over *logged* days rather than all days matters: a bucket holding
 * two 2,100 kcal days and one untracked day should read 2,100 a day, not 1,400.
 * `hasData` decides which days count.
 */
export function meanOverLogged<T>(
  days: T[],
  value: (d: T) => number,
  hasData: (d: T) => boolean,
): number {
  const logged = days.filter(hasData);
  if (logged.length === 0) return 0;
  return logged.reduce((a, d) => a + value(d), 0) / logged.length;
}

/**
 * Centred rolling mean. The window shrinks at the edges rather than dropping
 * points, so the smoothed line spans the same range as the raw one.
 */
export function rollingMean(values: number[], window: number): number[] {
  if (window <= 1) return values.slice();
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length, i + half + 1);
    let sum = 0;
    for (let j = from; j < to; j++) sum += values[j];
    return sum / (to - from);
  });
}

/**
 * Centred mean over a window of DAYS, not of entries.
 *
 * Weigh-ins are irregular, so "average of the last 7 readings" can span two
 * weeks and cannot honestly be called a 7-day average. This keys off the
 * dates, so the label matches the maths.
 */
export function rollingMeanByDate(
  points: { date: string; value: number }[],
  days: number,
): number[] {
  const half = Math.floor(days / 2);
  const ms = 86_400_000;
  const times = points.map((p) => new Date(`${p.date}T12:00:00Z`).getTime());
  return points.map((_, i) => {
    const lo = times[i] - half * ms;
    const hi = times[i] + half * ms;
    let sum = 0;
    let n = 0;
    for (let j = 0; j < points.length; j++) {
      if (times[j] >= lo && times[j] <= hi) {
        sum += points[j].value;
        n++;
      }
    }
    return n > 0 ? sum / n : points[i].value;
  });
}

/**
 * Smoothing window for a line series: 1 (none) while the series fits the
 * budget, otherwise an odd width proportional to how far over it is.
 */
export function smoothWindowFor(n: number, maxPoints: number): number {
  if (n <= maxPoints || maxPoints <= 0) return 1;
  const factor = Math.round(n / maxPoints);
  return Math.min(15, Math.max(3, factor * 2 + 1));
}

/**
 * Label for the aggregation chip, or null when the data is shown as logged.
 *
 * Bars bucket whole days, so their label is in days. Lines smooth over
 * *entries* — weigh-ins and training sessions aren't daily — so `unit` names
 * what the window actually counts rather than implying calendar days.
 */
export function aggregationLabel(
  bucketSize: number,
  smoothWindow: number,
  unit = "entry",
): string | null {
  if (bucketSize > 1) return `${bucketSize}-day group`;
  if (smoothWindow > 1) return `${smoothWindow}-${unit} group`;
  return null;
}

/**
 * A domain and tick list that land on readable numbers.
 *
 * Letting the chart divide an arbitrary maximum produced ticks like 650 and
 * 1.95k. This picks a step from 1/2/2.5/5/10 × a power of ten, so the labels
 * are always numbers a reader recognises.
 */
export function niceTicks(max: number, count = 5): { domain: [number, number]; ticks: number[] } {
  if (!(max > 0)) return { domain: [0, 1], ticks: [0, 1] };
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return {
    domain: [0, step * count],
    ticks: Array.from({ length: count + 1 }, (_, i) => i * step),
  };
}
