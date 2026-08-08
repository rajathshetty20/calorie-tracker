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
      <div className="flex flex-wrap items-center gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => start(c)}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
              running?.category === c
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <Play className="h-3 w-3 fill-current" />
            {displayCategory(c)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowOffset((v) => !v)}
          aria-expanded={showOffset}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
            offset !== 0
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700"
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          {offset === 0 ? "Offset" : offsetLabel}
        </button>
      </div>

      {showOffset && (
        <div className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
          <div className="mb-1.5 text-xs text-zinc-500">
            Shift the start. Before bed, pick <span className="font-medium">in 15 min</span> so the
            clock hits zero when you actually fall asleep.
          </div>
          <div className="flex flex-wrap gap-1">
            {OFFSETS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOffset(o)}
                className={`rounded px-2 py-1 text-xs tabular-nums ${
                  offset === o
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {o === 0 ? "now" : o > 0 ? `+${o}` : o}
              </button>
            ))}
          </div>
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
          placeholder="New activity (e.g. reading)"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        />
        <button
          type="submit"
          disabled={busy || !custom.trim()}
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Start
        </button>
      </form>

      {running && (
        <p className="text-xs text-zinc-500">
          Starting another activity stops{" "}
          <span className="font-medium">{displayCategory(running.category)}</span> at the same
          instant — no gap.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
