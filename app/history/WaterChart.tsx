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

export type WaterDay = { date: string; litres: number };

type Plot = WaterDay & { startDate: string; endDate: string; size: number };

export default function WaterChart({
  rows,
  avg7,
  std7,
}: {
  rows: WaterDay[];
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
        litres: meanOverLogged(b.days, (d) => d.litres, (d) => d.litres > 0),
      })),
    [windowed, bucketSize],
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <ChartHeader
        title="Water"
        avg={avg7}
        std={std7}
        note={aggregationLabel(bucketSize, 1)}
      />

      <div className={CHART_BODY} ref={ref}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => fmtTick(v, range)}
              {...AXIS_PROPS}
              {...xTickProps(range)}
            />
            <YAxis
              {...AXIS_PROPS}
              width={38}
              tickFormatter={(v: number) => `${v}L`}
            />
            <Tooltip cursor={CHART_CURSOR} content={<WaterTooltip />} />
            <Bar dataKey="litres" fill="#0ea5e9" name="Water" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

type TooltipPayloadItem = { payload?: Plot };
function WaterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <TooltipCard
      title={fmtSpan(row.startDate, row.endDate)}
      subtitle={row.size > 1 ? `Average per logged day · ${row.size} days` : null}
    >
      <div className="tabular-nums">{row.litres.toFixed(1)} L</div>
    </TooltipCard>
  );
}
