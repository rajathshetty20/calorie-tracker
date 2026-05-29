"use client";

import { format, parseISO } from "date-fns";

// Shared chrome so the three history charts read as one consistent set.

export type Range = 7 | 30 | 90;
export const RANGES: readonly Range[] = [7, 30, 90] as const;

// Tailwind height shared by every chart body.
export const CHART_BODY = "h-72 w-full";

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
          className={`px-2 py-1 ${
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

export function tickInterval(range: Range) {
  return range === 90 ? 6 : range === 30 ? 2 : 0;
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
