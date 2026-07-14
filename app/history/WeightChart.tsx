"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import {
  AXIS_PROPS,
  CHART_BODY,
  ChartHeader,
  fmtFullDate,
  fmtTick,
  TooltipCard,
  xTickProps,
  type Range,
} from "./chartParts";

export type WeightPoint = { date: string; kg: number };

export default function WeightChart({
  data: allData,
  today,
  avg7,
  std7,
}: {
  data: WeightPoint[];
  today: string; // YYYY-MM-DD, from the server
  avg7: string;
  std7: string;
}) {
  const [range, setRange] = useState<Range>(30);

  const data = useMemo(() => {
    const cutoff = format(subDays(parseISO(today), range - 1), "yyyy-MM-dd");
    return allData.filter((d) => d.date >= cutoff);
  }, [allData, today, range]);

  const values = data.map((d) => d.kg);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const pad = Math.max(1, (max - min) * 0.2);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <ChartHeader title="Weight" avg={avg7} std={std7} range={range} onChange={setRange} />

      {data.length === 0 ? (
        <div className={`${CHART_BODY} flex items-center justify-center`}>
          <p className="text-center text-sm text-zinc-500">
            No entries in this range — log your weight on the Today page.
          </p>
        </div>
      ) : (
        <div className={CHART_BODY}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => fmtTick(v, range)}
                {...AXIS_PROPS}
                {...xTickProps(range)}
              />
              <YAxis
                domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
                {...AXIS_PROPS}
                width={38}
              />
              <Tooltip content={<WeightTooltip />} />
              <Area
                type="monotone"
                dataKey="kg"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#weightGradient)"
                dot={{ r: 3, fill: "#10b981" }}
                activeDot={{ r: 5, fill: "#10b981", stroke: "var(--chart-surface)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

type TooltipPayloadItem = { payload?: WeightPoint };
function WeightTooltip({
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
      <div className="tabular-nums">{row.kg} kg</div>
    </TooltipCard>
  );
}
