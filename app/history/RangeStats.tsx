"use client";

import { meanStd } from "@/lib/types";
import { useRange } from "./RangeContext";

/**
 * Summary statistics for the window that is actually selected.
 *
 * These used to be fixed at 7 days no matter what: choosing 90d still showed
 * "7-day avg", which described a different period from the chart beside it.
 * They are computed on the client because the full lookback is already there.
 */
export type Series = { label: string; values: number[]; format: (n: number) => string };

export function useRangeStats(series: Series[]) {
  const { range } = useRange();
  return series.map((s) => {
    // Only days with data count — a blank day is missing, not a zero.
    const stats = meanStd(s.values.slice(-range).filter((v) => v > 0));
    return {
      label: s.label,
      avg: stats.n ? s.format(stats.mean) : "—",
      std: stats.n ? `±${s.format(stats.std)}` : "—",
      n: stats.n,
    };
  });
}

/** Headline avg / std for the whole chart, labelled with the real window. */
export function RangeHeadline({ series }: { series: Series }) {
  const { range } = useRange();
  const [stat] = useRangeStats([series]);
  return (
    <div className="flex gap-4 text-[0.75rem]">
      <div>
        <div className="text-ink-3">{range}-day avg</div>
        <div className="font-medium text-ink tabular-nums">{stat.avg}</div>
      </div>
      <div>
        <div className="text-ink-3">Std dev</div>
        <div className="font-medium text-ink tabular-nums">{stat.std}</div>
      </div>
    </div>
  );
}

/**
 * Per-category avg ± std under a chart. Kept to one compact row per category
 * so a breakdown doesn't cost as much space as the chart it describes.
 */
export function CategoryStats({
  series,
  colors,
}: {
  series: Series[];
  colors: Record<string, string>;
}) {
  const stats = useRangeStats(series);
  const shown = stats.filter((s) => s.n > 0);
  if (shown.length === 0) return null;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-rule-soft pt-2 text-[0.75rem] sm:grid-cols-3">
      {shown.map((s) => (
        <div key={s.label} className="flex items-baseline gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: colors[s.label] ?? "var(--ink-3)" }}
          />
          <dt className="truncate text-ink-3">{s.label}</dt>
          <dd className="ml-auto font-medium text-ink tabular-nums">
            {s.avg} <span className="font-normal text-ink-3">{s.std}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
