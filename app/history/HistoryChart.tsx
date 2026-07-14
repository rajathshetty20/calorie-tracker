"use client";

import { useMemo, useState } from "react";
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
import { format, parseISO } from "date-fns";
import {
  AXIS_PROPS,
  CHART_BODY,
  CHART_CURSOR,
  ChartHeader,
  fmtTick,
  TooltipCard,
  xTickProps,
  type Range,
} from "./chartParts";

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
  const [range, setRange] = useState<Range>(30);

  const data = useMemo(() => rows.slice(-range), [rows, range]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <ChartHeader title="Calories" avg={avg7} std={std7} range={range} onChange={setRange} />

      <div className={CHART_BODY}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => fmtTick(v, range)}
              {...AXIS_PROPS}
              {...xTickProps(range)}
            />
            <YAxis {...AXIS_PROPS} width={38} />
            <Tooltip cursor={CHART_CURSOR} content={<MacroTooltip />} />
            <ReferenceLine y={target} stroke="#71717a" strokeDasharray="4 4" />
            <Bar dataKey="carbs_kcal" stackId="kcal" fill="#f59e0b" name="Carbs" />
            <Bar dataKey="protein_kcal" stackId="kcal" fill="#0ea5e9" name="Protein" />
            <Bar dataKey="fat_kcal" stackId="kcal" fill="#f43f5e" name="Fat" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
        <Legend color="bg-amber-500" label="Carbs" />
        <Legend color="bg-sky-500" label="Protein" />
        <Legend color="bg-rose-500" label="Fat" />
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-zinc-400 dark:border-zinc-500" />
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

type TooltipPayloadItem = { payload?: DayRow };
function MacroTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  const dateLabel = label && typeof label === "string" ? format(parseISO(label), "PPP") : "";
  return (
    <TooltipCard title={dateLabel}>
      <div className="tabular-nums">Total: {Math.round(row.total_kcal)} kcal</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 tabular-nums text-zinc-500">
        <span>Carbs</span><span>{Math.round(row.carbs_g)}g · {Math.round(row.carbs_kcal)} kcal</span>
        <span>Protein</span><span>{Math.round(row.protein_g)}g · {Math.round(row.protein_kcal)} kcal</span>
        <span>Fat</span><span>{Math.round(row.fat_g)}g · {Math.round(row.fat_kcal)} kcal</span>
      </div>
    </TooltipCard>
  );
}
