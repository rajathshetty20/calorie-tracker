"use client";

import { useMemo } from "react";
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
import { AXIS_PROPS, CHART_BODY, fmtFullDate, fmtTick, TooltipCard, xTickProps } from "./chartParts";
import { useRange } from "./RangeContext";

type Point = { date: string; kcal: number | null; kg: number | null };

/**
 * The one chart this dataset exists to produce: intake against the thing
 * intake is supposed to move. Neither series is legible raw — daily calories
 * swing hundreds and scale weight swings with hydration — so both are shown
 * as 7-day rolling means. The correlation only appears once they're smoothed.
 */
export default function CaloriesWeightChart({
  calories,
  weights,
}: {
  calories: { date: string; total_kcal: number }[]; // continuous, full lookback
  weights: { date: string; kg: number }[];
}) {
  const { range } = useRange();

  const data = useMemo<Point[]>(() => {
    const days = calories.slice(-range);
    const byDate = new Map(weights.map((w) => [w.date, w.kg]));

    // Only logged days feed the calorie mean; a blank day is missing data,
    // not a zero-calorie day, and averaging the zeros would invent a dip.
    const kcalLogged = days.map((d) => (d.total_kcal > 0 ? d.total_kcal : null));
    const kcalSmooth = smoothSparse(kcalLogged, 7);

    // Weight is carried forward before smoothing so a skipped weigh-in leaves
    // a flat segment rather than a hole in the line. Built by pushing rather
    // than mutating a closed-over variable, which the React compiler rejects.
    const kgFilled: (number | null)[] = [];
    for (const d of days) {
      const v = byDate.get(d.date);
      kgFilled.push(v !== undefined ? v : (kgFilled.at(-1) ?? null));
    }
    const kgSmooth = smoothSparse(kgFilled, 7);

    return days.map((d, i) => ({
      date: d.date,
      kcal: kcalSmooth[i] === null ? null : Math.round(kcalSmooth[i]!),
      kg: kgSmooth[i] === null ? null : Math.round(kgSmooth[i]! * 10) / 10,
    }));
  }, [calories, weights, range]);

  const kgs = data.map((d) => d.kg).filter((v): v is number => v !== null);
  const kgMin = kgs.length ? Math.min(...kgs) : 0;
  const kgMax = kgs.length ? Math.max(...kgs) : 0;
  const pad = Math.max(0.5, (kgMax - kgMin) * 0.3);

  const hasBoth = data.some((d) => d.kcal !== null) && kgs.length > 0;

  return (
    <section className="border-t border-rule pt-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-2">
          Calories vs weight
        </h2>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-medium text-ink-2">
          7-day rolling avg
        </span>
      </div>

      {!hasBoth ? (
        <div className={`${CHART_BODY} flex items-center justify-center`}>
          <p className="text-center text-[0.8125rem] text-ink-3">
            Needs both meals and weigh-ins in this range to compare.
          </p>
        </div>
      ) : (
        <>
          <div className={CHART_BODY}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kcalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--food)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--food)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => fmtTick(v, range)}
                  {...AXIS_PROPS}
                  {...xTickProps(range)}
                />
                <YAxis yAxisId="kcal" {...AXIS_PROPS} width={40} />
                <YAxis
                  yAxisId="kg"
                  orientation="right"
                  domain={[Math.floor(kgMin - pad), Math.ceil(kgMax + pad)]}
                  {...AXIS_PROPS}
                  width={34}
                />
                <Tooltip content={<BothTooltip />} />
                <Area
                  yAxisId="kcal"
                  type="monotone"
                  dataKey="kcal"
                  stroke="var(--food)"
                  strokeWidth={2}
                  fill="url(#kcalFill)"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="kg"
                  type="monotone"
                  dataKey="kg"
                  stroke="var(--weight)"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[0.75rem] text-ink-3">
            <Key color="var(--food)" label="Calories (left)" />
            <Key color="var(--weight)" label="Weight (right)" />
          </div>
        </>
      )}
    </section>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/**
 * Centred rolling mean that skips gaps rather than counting them as zero,
 * and divides by the number of values actually present in each window.
 */
function smoothSparse(values: (number | null)[], window: number): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - half); j < Math.min(values.length, i + half + 1); j++) {
      const v = values[j];
      if (v !== null) {
        sum += v;
        n++;
      }
    }
    return n > 0 ? sum / n : null;
  });
}

type Item = { payload?: Point };
function BothTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Item[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <TooltipCard title={fmtFullDate(label)} subtitle="7-day averages">
      <div className="tnum">{row.kcal === null ? "—" : `${row.kcal.toLocaleString()} kcal/day`}</div>
      <div className="tnum text-ink-3">{row.kg === null ? "—" : `${row.kg} kg`}</div>
    </TooltipCard>
  );
}
