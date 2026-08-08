"use client";

import { useState } from "react";
import { RangeToggle } from "./chartParts";

// One chart at a time. Five stacked charts meant the range control repeated
// five times and any single comparison required scrolling past four others.
export default function ChartSwitcher({
  tabs,
}: {
  tabs: { key: string; label: string; color: string; node: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="space-y-3">
      {/* The range control gets its own row: on a 390px phone six chart tabs
          and three range buttons cannot share one line without clipping. */}
      <div className="flex justify-end">
        <RangeToggle />
      </div>
      {/* Six labels never fit one phone line, and wrapping them left a ragged
          second row. A native picker is one line, shows the current chart, and
          reaches every option; the tabs return where there is room. */}
      <label className="block md:hidden">
        <span className="sr-only">Chart</span>
        <select
          value={current.key}
          onChange={(e) => setActive(e.target.value)}
          className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.9375rem] font-semibold outline-none focus:border-ink"
        >
          {tabs.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="hidden items-center gap-1 md:flex">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            aria-pressed={t.key === current.key}
            className={`min-h-[38px] rounded-lg px-3 py-2 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors ${
              t.key === current.key ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {current.node}
    </div>
  );
}
