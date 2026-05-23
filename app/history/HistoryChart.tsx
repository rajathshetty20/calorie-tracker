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

type Range = 7 | 30 | 90;

export default function HistoryChart({
  rows,
  target,
}: {
  rows: DayRow[];
  target: number;
}) {
  const [range, setRange] = useState<Range>(30);

  const data = useMemo(() => rows.slice(-range), [rows, range]);

  const logged = data.filter((d) => d.total_kcal > 0);
  const avg =
    logged.length > 0
      ? Math.round(logged.reduce((a, d) => a + d.total_kcal, 0) / logged.length)
      : 0;
  const onTarget = logged.filter((d) => Math.abs(d.total_kcal - target) <= target * 0.1).length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <Stat label="Avg / logged day" value={`${avg} kcal`} />
          <Stat label="Within 10% target" value={`${onTarget}/${logged.length}`} />
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 text-xs dark:border-zinc-800">
          {([7, 30, 90] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2 py-1 ${
                range === r
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => format(parseISO(v), range === 7 ? "EEE" : "MMM d")}
              tick={{ fontSize: 11 }}
              stroke="#a1a1aa"
              interval={range === 90 ? 6 : range === 30 ? 2 : 0}
            />
            <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" width={42} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              labelFormatter={(v) =>
                typeof v === "string" ? format(parseISO(v), "PPP") : String(v ?? "")
              }
              content={<MacroTooltip />}
            />
            <ReferenceLine
              y={target}
              stroke="#71717a"
              strokeDasharray="4 4"
              label={{ value: `target ${target}`, position: "insideTopRight", fontSize: 11, fill: "#71717a" }}
            />
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
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{value}</div>
    </div>
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
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-1 font-medium">{dateLabel}</div>
      <div className="tabular-nums">Total: {Math.round(row.total_kcal)} kcal</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 tabular-nums text-zinc-500">
        <span>Carbs</span><span>{Math.round(row.carbs_g)}g · {Math.round(row.carbs_kcal)} kcal</span>
        <span>Protein</span><span>{Math.round(row.protein_g)}g · {Math.round(row.protein_kcal)} kcal</span>
        <span>Fat</span><span>{Math.round(row.fat_g)}g · {Math.round(row.fat_kcal)} kcal</span>
      </div>
    </div>
  );
}
