"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import WeekStats from "./WeekStats";
import {
  CHART_BODY,
  fmtFullDate,
  fmtTick,
  RangeToggle,
  TooltipCard,
  tickInterval,
  type Range,
} from "./chartParts";

export type WaterDay = { date: string; litres: number };

export default function WaterChart({
  rows,
  avg7,
  std7,
}: {
  rows: WaterDay[];
  avg7: string;
  std7: string;
}) {
  const [range, setRange] = useState<Range>(30);
  const data = useMemo(() => rows.slice(-range), [rows, range]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-zinc-500">Water</h2>
          <WeekStats avg={avg7} std={std7} />
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      <div className={CHART_BODY}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => fmtTick(v, range)}
              tick={{ fontSize: 11 }}
              stroke="#a1a1aa"
              interval={tickInterval(range)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#a1a1aa"
              width={42}
              tickFormatter={(v: number) => `${v}L`}
            />
            <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<WaterTooltip />} />
            <Bar dataKey="litres" fill="#0ea5e9" name="Water" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

type TooltipPayloadItem = { payload?: WaterDay };
function WaterTooltip({
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
  return (
    <TooltipCard title={fmtFullDate(label)}>
      <div className="tabular-nums">{row.litres.toFixed(1)} L</div>
    </TooltipCard>
  );
}
