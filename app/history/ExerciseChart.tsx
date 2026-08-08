"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import {
  estOneRepMax,
  exerciseVolume,
  topSetWeight,
  type Exercise,
  type ExerciseSet,
} from "@/lib/types";
import {
  AggregationChip,
  AXIS_PROPS,
  CHART_BODY,
  fmtFullDate,
  fmtTick,
  TooltipCard,
  xTickProps,
} from "./chartParts";
import { useRange } from "./RangeContext";
import {
  aggregationLabel,
  DOT_LIMIT,
  PX_PER_DOT,
  rollingMean,
  smoothWindowFor,
  useMaxPoints,
} from "./series";

type Metric = "top" | "e1rm" | "volume";
const METRICS: { key: Metric; label: string }[] = [
  { key: "top", label: "Top set" },
  { key: "e1rm", label: "Est. 1RM" },
  { key: "volume", label: "Volume" },
];

const METRIC_VALUE: Record<Metric, (sets: ExerciseSet[]) => number> = {
  top: topSetWeight,
  e1rm: estOneRepMax,
  volume: exerciseVolume,
};

type DayPoint = { date: string; value: number; sets: ExerciseSet[] };
type Plot = DayPoint & { smooth: number };

export default function ExerciseChart({
  rows,
  today,
}: {
  rows: Exercise[]; // full lookback, ascending by performed_on
  today: string; // YYYY-MM-DD, from the server
}) {
  // Names ordered by most recent use, so the default selection is the
  // exercise you're currently training.
  const names = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const key = rows[i].name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(rows[i].name);
    }
    return out;
  }, [rows]);

  const [name, setName] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("top");
  const { range } = useRange();
  const { ref, maxPoints } = useMaxPoints(PX_PER_DOT);
  const selected = name ?? names[0] ?? "";

  const sessions = useMemo<DayPoint[]>(() => {
    const cutoff = format(subDays(parseISO(today), range - 1), "yyyy-MM-dd");
    const key = selected.trim().toLowerCase();
    // Merge multiple entries of the same exercise on one day.
    const byDay = new Map<string, ExerciseSet[]>();
    for (const r of rows) {
      if (r.name.trim().toLowerCase() !== key || r.performed_on < cutoff) continue;
      byDay.set(r.performed_on, [...(byDay.get(r.performed_on) ?? []), ...r.sets]);
    }
    return Array.from(byDay.entries()).map(([date, sets]) => ({
      date,
      value: Math.round(METRIC_VALUE[metric](sets) * 10) / 10,
      sets,
    }));
  }, [rows, selected, range, metric, today]);

  // Sessions are sparse — a dozen points across 90 days is normal — so this
  // usually stays at 1 and the chart plots exactly what was lifted.
  const smoothWindow = smoothWindowFor(sessions.length, maxPoints);
  const smoothing = smoothWindow > 1;

  const data = useMemo<Plot[]>(() => {
    const means = rollingMean(sessions.map((d) => d.value), smoothWindow);
    return sessions.map((d, i) => ({ ...d, smooth: Math.round(means[i] * 10) / 10 }));
  }, [sessions, smoothWindow]);

  const values = data.flatMap((d) => (smoothing ? [d.value, d.smooth] : [d.value]));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const pad = Math.max(1, (max - min) * 0.2);

  return (
    <section className="border-t border-rule pt-3">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-[0.8125rem] font-medium text-ink-3">Exercise</h2>
        {aggregationLabel(1, smoothWindow, "session") && (
          <AggregationChip label={aggregationLabel(1, smoothWindow, "session")!} />
        )}
        {names.length > 0 && (
          <div className="order-last flex w-full flex-wrap items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setName(e.target.value)}
 className="min-w-0 flex-1 rounded-lg border border-rule bg-surface px-2 py-1.5 text-[0.8125rem] outline-none focus:border-ink " >
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="inline-flex overflow-hidden rounded-lg border border-rule text-[0.75rem]">
              {METRICS.map((m) => (
                <button
                  key={m.key} type="button"
                  onClick={() => setMetric(m.key)}
 className={`px-2.5 py-1.5 whitespace-nowrap ${
                    metric === m.key
                      ? "bg-ink text-ground"
                      : "bg-white text-ink-2 hover:bg-surface-2"
                  }`} >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {names.length === 0 ? (
        <div className={`${CHART_BODY} flex items-center justify-center`}>
          <p className="text-center text-[0.8125rem] text-ink-3">
            No exercises yet — log one on the Today page.
          </p>
        </div>
      ) : data.length === 0 ? (
        <div className={`${CHART_BODY} flex items-center justify-center`}>
          <p className="text-center text-[0.8125rem] text-ink-3">
            No entries for {selected} in this range.
          </p>
        </div>
      ) : (
        <div className={CHART_BODY} ref={ref}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="exerciseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => fmtTick(v, range)}
                {...AXIS_PROPS}
                {...xTickProps(range)} />
              <YAxis
                domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
                {...AXIS_PROPS}
                width={38}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
              <Tooltip content={<ExerciseTooltip metric={metric} smoothing={smoothing} />} />
              <Area type="monotone"
                dataKey={smoothing ? "smooth" : "value"} stroke="#8b5cf6"
                strokeWidth={2.5} fill="url(#exerciseGradient)"
                dot={data.length <= DOT_LIMIT ? { r: 3, fill: "#8b5cf6" } : false}
                activeDot={{ r: 5, fill: "#8b5cf6", stroke: "var(--chart-surface)", strokeWidth: 2 }}
                isAnimationActive={false} />
              {smoothing && (
                <Line type="monotone"
                  dataKey="value" stroke="#8b5cf6"
                  strokeOpacity={0.28}
                  strokeWidth={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

const METRIC_LABEL: Record<Metric, string> = {
  top: "Top set",
  e1rm: "Est. 1RM",
  volume: "Volume",
};

type TooltipPayloadItem = { payload?: Plot };
function ExerciseTooltip({
  active,
  payload,
  label,
  metric,
  smoothing,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  metric: Metric;
  smoothing: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <TooltipCard title={fmtFullDate(label)}>
      <div className="tabular-nums">
        {METRIC_LABEL[metric]}: {row.value.toLocaleString()}
        {metric === "volume" ? "" : " kg"}
      </div>
      {smoothing && (
        <div className="tabular-nums text-ink-3">
          Trend {row.smooth.toLocaleString()}
          {metric === "volume" ? "" : " kg"}
        </div>
      )}
      <div className="mt-1 tabular-nums text-ink-3">
        {row.sets.map((s, i) => (
          <div key={i}>
            Set {i + 1}: {s.weight_kg}kg × {s.reps}
          </div>
        ))}
      </div>
    </TooltipCard>
  );
}
