"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisLabel, AXIS_PROPS, CHART_BODY, fmtFullDate, fmtTick, TooltipCard, xTickProps } from "./chartParts";
import { useRange } from "./RangeContext";

type Point = { date: string; kcal: number | null; kg: number | null };

/**
 * Calories against the thing calories are supposed to move.
 *
 * Deliberately NOT a dual-axis chart. Two y-scales let you manufacture any
 * correlation you like by choosing where the scales cross, and in the earlier
 * version the weight line sat inside the calorie area fill and read as a
 * component of it. Stacked panels sharing one x-axis show the same comparison
 * without asserting a relationship the data may not support.
 *
 * Both series are 7-day rolling means: daily intake swings by hundreds and
 * scale weight swings with hydration, so neither is legible raw.
 */
export default function CaloriesWeightChart({
  calories,
  weights,
}: {
  calories: { date: string; total_kcal: number }[];
  weights: { date: string; kg: number }[];
}) {
  const { range } = useRange();

  const data = useMemo<Point[]>(() => {
    const days = calories.slice(-range);
    const byDate = new Map(weights.map((w) => [w.date, w.kg]));

    // Only logged days feed the calorie mean; a blank day is missing data,
    // not a zero-calorie day, and averaging the zeros would invent a dip.
    const kcalSmooth = smoothSparse(
      days.map((d) => (d.total_kcal > 0 ? d.total_kcal : null)),
      7,
    );

    // Weight carries forward across skipped weigh-ins so a gap reads as a
    // flat segment rather than a hole.
    const filled: (number | null)[] = [];
    for (const d of days) {
      const v = byDate.get(d.date);
      filled.push(v !== undefined ? v : (filled.at(-1) ?? null));
    }
    const kgSmooth = smoothSparse(filled, 7);

    return days.map((d, i) => ({
      date: d.date,
      kcal: kcalSmooth[i] === null ? null : Math.round(kcalSmooth[i]!),
      kg: kgSmooth[i] === null ? null : Math.round(kgSmooth[i]! * 10) / 10,
    }));
  }, [calories, weights, range]);

  const kcals = data.map((d) => d.kcal).filter((v): v is number => v !== null);
  const kgs = data.map((d) => d.kg).filter((v): v is number => v !== null);
  const hasBoth = kcals.length > 0 && kgs.length > 0;
  const kgMin = kgs.length ? Math.min(...kgs) : 0;
  const kgMax = kgs.length ? Math.max(...kgs) : 0;
  const pad = Math.max(0.3, (kgMax - kgMin) * 0.3);

  return (
    <section className="border-t border-rule pt-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-2">
          Calories vs weight
        </h2>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-medium text-ink-2">
          7-day average
        </span>
      </div>

      {!hasBoth ? (
        <div className="flex h-56 items-center justify-center sm:h-72">
          <p className="text-center text-[0.8125rem] text-ink-3">
            Needs both meals and weigh-ins in this range to compare.
          </p>
        </div>
      ) : (
        <>
          <div className={CHART_BODY}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => fmtTick(v, range)}
                  {...AXIS_PROPS}
                  {...xTickProps(range)}
                />
                {/* Two scales, so each axis is tinted to its series — with a
                    shared axis there is nothing to tell you which is which,
                    and where the two lines cross means nothing. */}
                <YAxis
                  yAxisId="kcal"
                  {...AXIS_PROPS}
                  tick={{ ...AXIS_PROPS.tick, fill: "var(--food)" }}
                  width={50}
                  domain={[0, "auto"]}
                  label={axisLabel("kcal", "var(--food)")}
                />
                <YAxis
                  yAxisId="kg"
                  orientation="right"
                  {...AXIS_PROPS}
                  tick={{ ...AXIS_PROPS.tick, fill: "var(--weight)" }}
                  width={44}
                  label={axisLabel("kg", "var(--weight)", "right")}
                  domain={[
                    Math.floor((kgMin - pad) * 10) / 10,
                    Math.ceil((kgMax + pad) * 10) / 10,
                  ]}
                />
                <Tooltip content={<BothTooltip />} />
                <Line
                  yAxisId="kcal"
                  type="monotone"
                  dataKey="kcal"
                  name="Calories"
                  stroke="var(--food)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="kg"
                  type="monotone"
                  dataKey="kg"
                  name="Weight"
                  stroke="var(--weight)"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[0.75rem] text-ink-3">
            <Key color="var(--food)" label="Calories / day — left axis" />
            <Key color="var(--weight)" label="Weight — right axis" />
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

type Row = { date: string; kcal: number | null; kg: number | null };
function BothTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: Row }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <TooltipCard title={fmtFullDate(label)} subtitle="7-day average">
      <div className="tnum" style={{ color: "var(--food)" }}>
        {row.kcal === null ? "—" : `${row.kcal.toLocaleString()} kcal/day`}
      </div>
      <div className="tnum" style={{ color: "var(--weight)" }}>
        {row.kg === null ? "—" : `${row.kg} kg`}
      </div>
    </TooltipCard>
  );
}

/** Centred rolling mean that skips gaps rather than counting them as zero. */
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

