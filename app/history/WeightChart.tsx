"use client";

import { useMemo } from "react";
import {
  Line,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
} from "./chartParts";
import { useRange } from "./RangeContext";
import { RangeHeadline } from "./RangeStats";
import {
  DOT_LIMIT,
  PX_PER_DOT,
  rollingMeanByDate,
  smoothWindowFor,
  useMaxPoints,
} from "./series";

export type WeightPoint = { date: string; kg: number };
type Plot = WeightPoint & { smooth: number };

export default function WeightChart({
  data: allData,
  today,
}: {
  data: WeightPoint[];
  today: string; // YYYY-MM-DD, from the server
}) {
  const { range } = useRange();
  const { ref, maxPoints } = useMaxPoints(PX_PER_DOT);

  const windowed = useMemo(() => {
    const cutoff = format(subDays(parseISO(today), range - 1), "yyyy-MM-dd");
    return allData.filter((d) => d.date >= cutoff);
  }, [allData, today, range]);

  // Smoothing is measured in days, so the chip can say "7-day average" and
  // mean it even when weigh-ins skip a day.
  const smoothWindow = smoothWindowFor(windowed.length, maxPoints);
  const smoothing = smoothWindow > 1;

  const data = useMemo<Plot[]>(() => {
    const means = rollingMeanByDate(
      windowed.map((d) => ({ date: d.date, value: d.kg })),
      smoothWindow,
    );
    return windowed.map((d, i) => ({ ...d, smooth: Math.round(means[i] * 10) / 10 }));
  }, [windowed, smoothWindow]);

  const values = data.map((d) => (smoothing ? d.smooth : d.kg));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const pad = Math.max(0.3, (max - min) * 0.25);

  return (
    <section className="border-t border-rule pt-3">
      <ChartHeader
        title="Weight"
        unit="kg"
        stats={
          <RangeHeadline
            series={{
              label: "Weight",
              values: allData.map((d) => d.kg),
              format: (n) => `${n.toFixed(1)} kg`,
            }}
          />
        }
        note={smoothing ? `${smoothWindow}-day group` : null}
      />

      {data.length === 0 ? (
        <div className={`${CHART_BODY} flex items-center justify-center`}>
          <p className="text-center text-[0.8125rem] text-ink-3">
            No entries in this range — log your weight on the Today page.
          </p>
        </div>
      ) : (
        <div className={CHART_BODY} ref={ref}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => fmtTick(v, range)}
                {...AXIS_PROPS}
                {...xTickProps(range)} />
              <YAxis
                domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
                {...AXIS_PROPS}
                width={44} />
              <Tooltip content={<WeightTooltip smoothing={smoothing} />} />

              {/* A line, not an area. An area fill measures down to the axis
                  baseline, but this axis starts near 71kg — the shaded region
                  would represent nothing. The headline series is the raw
                  readings when they fit, the trend when they don't. */}
              <Line
                type="monotone"
                dataKey={smoothing ? "smooth" : "kg"}
                stroke="var(--weight)"
                strokeWidth={2.5}
                dot={data.length <= DOT_LIMIT ? { r: 3, fill: "var(--weight)" } : false}
                activeDot={{ r: 5, fill: "var(--weight)", stroke: "var(--chart-surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

type TooltipPayloadItem = { payload?: Plot };
function WeightTooltip({
  active,
  payload,
  label,
  smoothing,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  smoothing: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <TooltipCard title={fmtFullDate(label)}>
      <div className="tabular-nums">{row.kg} kg</div>
      {smoothing && (
        <div className="tabular-nums text-ink-3">Trend {row.smooth} kg</div>
      )}
    </TooltipCard>
  );
}
