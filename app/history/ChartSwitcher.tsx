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
      <div className="flex items-center gap-2">
        <div className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              aria-pressed={t.key === current.key}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors ${
                t.key === current.key ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: t.key === current.key ? t.color : "transparent" }}
                />
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      {current.node}
    </div>
  );
}
