"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_PROPS,
  CHART_BODY,
  CHART_CURSOR,
  ChartHeader,
  fmtSpan,
  fmtTick,
  TooltipCard,
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

export type DayRow = {
  date: string; // YYYY-MM-DD
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  carbs_kcal: number;
  protein_kcal: number;
  fat_kcal: number;
  total_kcal: number;
};

// A plotted bar: one day, or the daily average across a bucket of days.
type Plot = DayRow & { startDate: string; endDate: string; size: number };

const logged = (d: DayRow) => d.total_kcal > 0;

export default function HistoryChart({
  rows,
  target,
  avg7,
  std7,
}: {
  rows: DayRow[];
  target: number;
  avg7: string;
  std7: string;
}) {
  const { range } = useRange();
  const { ref, maxPoints } = useMaxPoints(PX_PER_BAR);

  const windowed = useMemo(() => rows.slice(-range), [rows, range]);
  const bucketSize = bucketSizeFor(windowed.length, maxPoints);

  const data = useMemo<Plot[]>(
    () =>
      bucketDays(windowed, bucketSize).map((b) => ({
        date: b.date,
        startDate: b.startDate,
        endDate: b.endDate,
        size: b.size,
        carbs_g: meanOverLogged(b.days, (d) => d.carbs_g, logged),
        protein_g: meanOverLogged(b.days, (d) => d.protein_g, logged),
        fat_g: meanOverLogged(b.days, (d) => d.fat_g, logged),
        carbs_kcal: meanOverLogged(b.days, (d) => d.carbs_kcal, logged),
        protein_kcal: meanOverLogged(b.days, (d) => d.protein_kcal, logged),
        fat_kcal: meanOverLogged(b.days, (d) => d.fat_kcal, logged),
        total_kcal: meanOverLogged(b.days, (d) => d.total_kcal, logged),
      })),
    [windowed, bucketSize],
  );

  return (
    <section className="border-t border-rule pt-3">
      <ChartHeader title="Calories"
        avg={avg7}
        std={std7}
        note={aggregationLabel(bucketSize, 1)} />

      <div className={CHART_BODY} ref={ref}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => fmtTick(v, range)}
              {...AXIS_PROPS}
              {...xTickProps(range)} />
            {/* The domain must reach the target, or the reference line below is
                  clipped out of the plot while the legend still claims it. */}
              <YAxis
                {...AXIS_PROPS}
                width={38}
                domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, target) * 1.08)]}
              />
            <Tooltip cursor={CHART_CURSOR} content={<MacroTooltip />} />
            <ReferenceLine y={target} stroke="var(--ink-3)" strokeDasharray="4 4" ifOverflow="visible" />
            <Bar dataKey="carbs_kcal" stackId="kcal" fill="#f59e0b" name="Carbs" />
            <Bar dataKey="protein_kcal" stackId="kcal" fill="#0ea5e9" name="Protein" />
            <Bar dataKey="fat_kcal" stackId="kcal" fill="#f43f5e" name="Fat" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[0.75rem] text-ink-3">
        <Legend color="bg-amber-500" label="Carbs" />
        <Legend color="bg-sky-500" label="Protein" />
        <Legend color="bg-rose-500" label="Fat" />
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-rule" />
          Target {target}
        </span>
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

type TooltipPayloadItem = { payload?: Plot };
function MacroTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  const bucketed = row.size > 1;
  return (
    <TooltipCard
      title={fmtSpan(row.startDate, row.endDate)}
      subtitle={bucketed ? `Average per logged day · ${row.size} days` : null} >
      <div className="tabular-nums">Total: {Math.round(row.total_kcal)} kcal</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 tabular-nums text-ink-3">
        <span>Carbs</span><span>{Math.round(row.carbs_g)}g · {Math.round(row.carbs_kcal)} kcal</span>
        <span>Protein</span><span>{Math.round(row.protein_g)}g · {Math.round(row.protein_kcal)} kcal</span>
        <span>Fat</span><span>{Math.round(row.fat_g)}g · {Math.round(row.fat_kcal)} kcal</span>
      </div>
    </TooltipCard>
  );
}
