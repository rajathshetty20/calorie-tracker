"use client";

import { format, parseISO } from "date-fns";
import { useRange } from "./RangeContext";
import { RANGES, type Range } from "./range";

// Shared chrome so the history charts read as one consistent set.

export type { Range };
export { RANGES };

// Tailwind height shared by every chart body — shorter on phones so all
// the charts scan without endless scrolling.
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
  stats,
  note,
}: {
  title: string;
  /** Summary for the selected window, not a fixed 7 days. */
  stats?: React.ReactNode;
  /** Aggregation label, shown only when the chart isn't plotting raw days. */
  note?: string | null;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="text-[0.8125rem] font-medium text-ink-3">{title}</h2>
      {note && <AggregationChip label={note} />}
      {/* The range control belongs to ChartSwitcher now — one per page. */}
      <div className="ml-auto">{stats}</div>
    </div>
  );
}

// Never let an aggregated chart pass for a raw one.
export function AggregationChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
      {label}
    </span>
  );
}

export function RangeToggle() {
  const { range, setRange } = useRange();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-rule text-[0.75rem]">
      {RANGES.map((r) => (
        <button
          key={r} type="button"
          onClick={() => setRange(r)}
          aria-pressed={range === r}
 className={`min-h-[38px] px-3 py-2 ${
            range === r
              ? "bg-ink text-ground"
              : "bg-surface text-ink-2 hover:bg-surface-2"
          }`} >
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

// Bucketed points cover a span, so the tooltip has to name the span rather
// than pretend the value belongs to its end date.
export function fmtSpan(startDate: string, endDate: string) {
  if (startDate === endDate) return fmtFullDate(endDate);
  const a = parseISO(startDate);
  const b = parseISO(endDate);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  return `${format(a, "MMM d")} – ${format(b, sameMonth ? "d, yyyy" : "MMM d, yyyy")}`;
}

// Consistent tooltip surface for all the charts.
export function TooltipCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-rule bg-surface px-3 py-2 text-[0.75rem] shadow-sm ">
      <div className="font-medium">{title}</div>
      {subtitle && <div className="mb-1 text-ink-3">{subtitle}</div>}
      {!subtitle && <div className="mb-1" />}
      {children}
    </div>
  );
}
