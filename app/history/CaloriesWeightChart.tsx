"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, fmtFullDate, fmtTick, TooltipCard, xTickProps } from "./chartParts";
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

  const kgs = data.map((d) => d.kg).filter((v): v is number => v !== null);
  const hasBoth = data.some((d) => d.kcal !== null) && kgs.length > 0;
  const kgMin = kgs.length ? Math.min(...kgs) : 0;
  const kgMax = kgs.length ? Math.max(...kgs) : 0;
  const pad = Math.max(0.3, (kgMax - kgMin) * 0.25);

  const axis = (
    <XAxis
      dataKey="date"
      tickFormatter={(v: string) => fmtTick(v, range)}
      {...AXIS_PROPS}
      {...xTickProps(range)}
    />
  );

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
        <div className="flex h-56 items-center justify-center sm:h-72">
          <p className="text-center text-[0.8125rem] text-ink-3">
            Needs both meals and weigh-ins in this range to compare.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <Panel label="Calories / day">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} syncId="calwt">
              <defs>
                <linearGradient id="kcalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--food)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--food)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              {axis}
              <YAxis {...AXIS_PROPS} width={44} domain={[0, "auto"]} />
              <Tooltip content={<PanelTooltip unit=" kcal/day" field="kcal" />} />
              <Area
                type="monotone"
                dataKey="kcal"
                stroke="var(--food)"
                strokeWidth={2}
                fill="url(#kcalFill)"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          </Panel>

          <Panel label="Weight">
            <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} syncId="calwt">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              {axis}
              <YAxis
                {...AXIS_PROPS}
                width={44}
                domain={[Math.floor((kgMin - pad) * 10) / 10, Math.ceil((kgMax + pad) * 10) / 10]}
              />
              <Tooltip content={<PanelTooltip unit=" kg" field="kg" />} />
              <Line
                type="monotone"
                dataKey="kg"
                stroke="var(--weight)"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </Panel>
        </div>
      )}
    </section>
  );
}

// Each panel names its own series, so no legend is needed and no colour has
// to carry identity on its own.
function Panel({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <div>
      <div className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className="h-28 w-full sm:h-36">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
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

type Item = { payload?: Point };
function PanelTooltip({
  active,
  payload,
  label,
  unit,
  field,
}: {
  active?: boolean;
  payload?: Item[];
  label?: string;
  unit: string;
  field: "kcal" | "kg";
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  const v = row[field];
  return (
    <TooltipCard title={fmtFullDate(label)} subtitle="7-day average">
      <div className="tnum">{v === null ? "—" : `${v.toLocaleString()}${unit}`}</div>
    </TooltipCard>
  );
}
