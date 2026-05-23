"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function WeightChart({
  data,
}: {
  data: { date: string; kg: number }[];
}) {
  const values = data.map((d) => d.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.2);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => format(parseISO(v), "MMM d")}
            tick={{ fontSize: 12 }}
            stroke="#a1a1aa"
          />
          <YAxis
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={{ fontSize: 12 }}
            stroke="#a1a1aa"
            width={36}
          />
          <Tooltip
            labelFormatter={(v) =>
              typeof v === "string" ? format(parseISO(v), "PPP") : String(v ?? "")
            }
            formatter={(v) => [`${v} kg`, "Weight"]}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
