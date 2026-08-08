"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { displayCategory, fmtDuration } from "@/lib/types";
import {
  AXIS_PROPS,
  CHART_BODY,
  CHART_CURSOR,
  ChartHeader,
  fmtSpan,
  fmtTick,
  xTickProps,
} from "./chartParts";
import { useRange } from "./RangeContext";
import {
  aggregationLabel,
  bucketDays,
  bucketSizeFor,
  meanOverLogged,
  PX_PER_BAR,
  useMaxPoints,
} from "./series";

export type TimeDay = { date: string; totals: Record<string, number> };

// Fixed assignment order; categories beyond the palette fold into "Other".
const CAT_COLORS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--cat-${i})`);
const OTHER = "other";
const OTHER_COLOR = "var(--cat-other)";

type ChartRow = { date: string; startDate: string; endDate: string; size: number } & Record<
  string,
  number | string
>;

export default function TimeChart({
  rows,
  avg7,
  std7,
}: {
  rows: TimeDay[]; // continuous full lookback, ascending
  avg7: string;
  std7: string;
}) {
  const { range } = useRange();
  const { ref, maxPoints } = useMaxPoints(PX_PER_BAR);

  // Colors are assigned from total minutes over the FULL lookback so the
  // range toggle never repaints a category.
  const { named, folded } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of rows) {
      for (const [cat, min] of Object.entries(r.totals)) {
        totals.set(cat, (totals.get(cat) ?? 0) + min);
      }
    }
    const ordered = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
    return {
      named: ordered.slice(0, CAT_COLORS.length),
      folded: ordered.slice(CAT_COLORS.length),
    };
  }, [rows]);

  const windowed = useMemo(() => rows.slice(-range), [rows, range]);
  const bucketSize = bucketSizeFor(windowed.length, maxPoints);

  // A day counts toward the average if anything at all was tracked on it —
  // otherwise an untracked weekend would drag every category down.
  const tracked = (d: TimeDay) => Object.values(d.totals).some((m) => m > 0);

  const data = useMemo<ChartRow[]>(
    () =>
      bucketDays(windowed, bucketSize).map((b) => {
        const row: ChartRow = {
          date: b.date,
          startDate: b.startDate,
          endDate: b.endDate,
          size: b.size,
        };
        for (const cat of named) {
          row[`c_${cat}`] = meanOverLogged(b.days, (d) => d.totals[cat] ?? 0, tracked);
        }
        if (folded.length > 0) {
          row[`c_${OTHER}`] = meanOverLogged(
            b.days,
            (d) => folded.reduce((a, cat) => a + (d.totals[cat] ?? 0), 0),
            tracked,
          );
        }
        return row;
      }),
    [windowed, bucketSize, named, folded],
  );

  const series = [
    ...named.map((cat, i) => ({ key: `c_${cat}`, label: displayCategory(cat), color: CAT_COLORS[i] })),
    ...(folded.length > 0 ? [{ key: `c_${OTHER}`, label: "Other", color: OTHER_COLOR }] : []),
  ];

  return (
    <section className="border-t border-rule pt-3">
      <ChartHeader title="Time"
        avg={avg7}
        std={std7}
        note={aggregationLabel(bucketSize, 1)} />

      {named.length === 0 ? (
        <div className={`${CHART_BODY} flex items-center justify-center`}>
          <p className="text-center text-[0.8125rem] text-ink-3">
            No time tracked yet — log it on the Today page.
          </p>
        </div>
      ) : (
        <>
          <div className={CHART_BODY} ref={ref}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => fmtTick(v, range)}
                  {...AXIS_PROPS}
                  {...xTickProps(range)} />
                <YAxis
                  {...AXIS_PROPS}
                  width={38}
                  tickFormatter={(v: number) => `${Math.round((v / 60) * 10) / 10}h`} />
                <Tooltip cursor={CHART_CURSOR} content={<TimeTooltip series={series} />} />
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    stackId="time"
                    name={s.label}
                    fill={s.color} stroke="var(--chart-surface)"
                    strokeWidth={1}
                    radius={i === series.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[0.75rem] text-ink-3">
            {series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <span
 className="inline-block h-2 w-2 rounded-sm"
                  style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

type Series = { key: string; label: string; color: string };
type TooltipPayloadItem = { payload?: ChartRow };
function TimeTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  series: Series[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  const present = series
    .map((s) => ({ ...s, minutes: Number(row[s.key]) || 0 }))
    .filter((s) => s.minutes > 0);
  if (present.length === 0) return null;
  const total = present.reduce((a, s) => a + s.minutes, 0);
  return (
    <div className="rounded-lg border border-rule bg-surface px-3 py-2 text-[0.75rem] shadow-sm ">
      <div className="font-medium">{fmtSpan(row.startDate, row.endDate)}</div>
      {row.size > 1 && (
        <div className="mb-1 text-ink-3">Average per tracked day · {row.size} days</div>
      )}
      <div className="tabular-nums">Total: {fmtDuration(total)}</div>
      <div className="mt-1 space-y-0.5">
        {present.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 tabular-nums text-ink-3">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
            <span className="ml-auto pl-3">{fmtDuration(s.minutes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
