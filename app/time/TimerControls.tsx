"use client";

import { useState } from "react";
import { Play, Timer } from "lucide-react";
import { displayCategory } from "@/lib/types";
import { useWrite } from "../useWrite";

// Offsets in minutes. Negative is the common case — you remember to start
// the timer a few minutes after you actually began.
const OFFSETS = [-30, -15, -5, 0, 5, 15, 30] as const;

// Module scope: reading the clock inside the component body trips the React
// compiler's impure-call rule, and this only ever runs from a click.
function startedAtFor(offsetMinutes: number) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

export default function TimerControls({
  categories,
  running,
}: {
  categories: string[]; // recent, lowercase
  running: { category: string } | null;
}) {
  const { run, busy, error } = useWrite();
  const [custom, setCustom] = useState("");
  const [offset, setOffset] = useState<number>(0);
  const [showOffset, setShowOffset] = useState(false);

  async function start(category: string) {
    const name = category.trim().toLowerCase();
    if (!name) return;
    const startedAt = startedAtFor(offset);
    // One RPC: switching must close the old entry and open the new one
    // together, or a failure between them leaves two timers or none.
    const ok = await run(({ supabase }) =>
      supabase.rpc("start_timer", { p_category: name, p_started_at: startedAt }),
    );
    if (ok) {
      setCustom("");
      setOffset(0);
      setShowOffset(false);
    }
  }

  const offsetLabel =
    offset === 0 ? "now" : offset < 0 ? `${Math.abs(offset)} min ago` : `in ${offset} min`;

  return (
    <div className="space-y-2">
      {/* One idea per row: what to start, then when to start it. The offset
          used to sit inside the chip row, so three different mechanisms —
          pick an activity, shift the clock, name a new one — read as one
          undifferentiated block. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-ink-3">
          Start a timer
        </span>
        <button
          type="button"
          onClick={() => setShowOffset((v) => !v)}
          aria-expanded={showOffset}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.75rem] text-ink-2 hover:bg-surface-2"
        >
          <Timer className="h-3.5 w-3.5" />
          Starting {offsetLabel}
        </button>
      </div>

      {showOffset && (
        <div className="rounded-lg border border-rule p-2">
          <div className="mb-1.5 text-[0.75rem] text-ink-3">
            Shift the start. Before bed, pick <span className="font-medium">in 15 min</span> so the
            clock hits zero when you actually fall asleep.
          </div>
          <div className="flex flex-wrap gap-1">
            {OFFSETS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOffset(o)}
                className={`min-h-[34px] rounded px-2.5 py-1 text-[0.75rem] tabular-nums ${
                  offset === o ? "bg-ink text-ground" : "bg-surface-2 text-ink-2"
                }`}
              >
                {o === 0 ? "now" : o > 0 ? `+${o}` : o}
              </button>
            ))}
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => start(c)}
              disabled={busy}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors disabled:opacity-50 ${
                running?.category === c
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-rule text-ink hover:bg-surface-2"
              }`}
            >
              <Play className="h-3 w-3 fill-current" />
              {displayCategory(c)}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(custom);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={categories.length ? "Something else…" : "Activity name (e.g. sleep)"}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-rule bg-surface px-3 py-2 outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={busy || !custom.trim()}
          className="shrink-0 rounded-lg bg-ink px-4 py-2 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40"
        >
          Start
        </button>
      </form>

      {running && (
        <p className="text-[0.75rem] text-ink-3">
          Starting another stops{" "}
          <span className="font-medium">{displayCategory(running.category)}</span> at the same
          instant — no gap.
        </p>
      )}
      {error && <p className="text-[0.8125rem] text-over">{error}</p>}
    </div>
  );
}
