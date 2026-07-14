"use client";

import { format, parseISO } from "date-fns";
import WeekStats from "./WeekStats";

// Shared chrome so the three history charts read as one consistent set.

export type Range = 7 | 30 | 90;
export const RANGES: readonly Range[] = [7, 30, 90] as const;

// Tailwind height shared by every chart body — shorter on phones so all
// three charts scan without endless scrolling.
export const CHART_BODY = "h-56 w-full sm:h-72";

// Theme-aware axis styling shared by every axis (colors come from the
// --chart-* CSS variables so dark mode just works).
export const AXIS_PROPS = {
  tick: { fontSize: 11, fill: "rgb(113 113 122)" },
  axisLine: { stroke: "var(--chart-grid)" },
  tickLine: { stroke: "var(--chart-grid)" },
} as const;

export const CHART_CURSOR = { fill: "var(--chart-cursor)" } as const;

// Header that keeps title + range toggle on one row and lets the weekly
// stats wrap to their own line on narrow screens.
export function ChartHeader({
  title,
  avg,
  std,
  range,
  onChange,
}: {
  title: string;
  avg: string;
  std: string;
  range: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="text-sm font-medium text-zinc-500">{title}</h2>
      <div className="order-last w-full sm:order-none sm:w-auto">
        <WeekStats avg={avg} std={std} />
      </div>
      <div className="ml-auto">
        <RangeToggle value={range} onChange={onChange} />
      </div>
    </div>
  );
}

export function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 text-xs dark:border-zinc-800">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-2.5 py-1.5 ${
            value === r
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {r}d
        </button>
      ))}
    </div>
  );
}

export function fmtTick(v: string, range: Range) {
  return format(parseISO(v), range === 7 ? "EEE" : "MMM d");
}

// 7d shows every weekday; longer ranges let Recharts thin ticks to fit
// the actual chart width instead of a fixed interval that overflows on
// narrow screens.
export function xTickProps(range: Range) {
  return range === 7
    ? { interval: 0 as const }
    : { interval: "preserveStartEnd" as const, minTickGap: 32 };
}

export function fmtFullDate(v: unknown) {
  return typeof v === "string" ? format(parseISO(v), "PPP") : String(v ?? "");
}

// Consistent tooltip surface for all three charts.
export function TooltipCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-1 font-medium">{title}</div>
      {children}
    </div>
  );
}
