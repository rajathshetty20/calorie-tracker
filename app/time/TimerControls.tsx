"use client";

import { useState } from "react";
import { Play, Timer } from "lucide-react";
import { displayCategory } from "@/lib/types";
import { useWrite } from "../useWrite";
import { SignInToSave, useIsDemo } from "../DemoContext";

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
  const isDemo = useIsDemo();
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
            key={c} type="button"
            onClick={() => start(c)}
            disabled={busy || isDemo}
            title={isDemo ? "Sign in to start a timer" : undefined}
 className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors disabled:opacity-50 ${
              running?.category === c
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "border-rule text-ink hover:border-rule hover:bg-surface-2"
            }`} >
            <Play className="h-3 w-3 fill-current" />
            {displayCategory(c)}
          </button>
        ))}
        <button type="button"
          onClick={() => setShowOffset((v) => !v)}
          aria-expanded={showOffset}
 className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors ${
            offset !== 0
              ? "border-rule text-ink"
              : "border-dashed border-rule text-ink-3 hover:border-rule"
          }`} >
          <Timer className="h-3.5 w-3.5" />
          {offset === 0 ? "Offset" : offsetLabel}
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
                key={o} type="button"
                onClick={() => setOffset(o)}
 className={`rounded px-2 py-1 text-[0.75rem] tabular-nums ${
                  offset === o
                    ? "bg-ink text-ground"
                    : "bg-surface-2 text-ink-2 hover:bg-surface-2"
                }`} >
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
 className="flex gap-2" >
        <input type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          disabled={isDemo}
          placeholder={isDemo ? "Sign in to time your own" : "New activity (e.g. reading)"}
          autoComplete="off"
 className="min-w-0 flex-1 rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] outline-none focus:border-ink " />
        {isDemo ? (
          <SignInToSave label="Sign in" className="shrink-0" />
        ) : (
          <button type="submit"
            disabled={busy || !custom.trim()}
   className="shrink-0 rounded-lg bg-ink px-3 py-2 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40" >
            Start
          </button>
        )}
      </form>

      {isDemo && (
        // One sign-in affordance per action: the button beside the field
        // already covers starting, so this is explanation only.
        <p className="text-[0.75rem] text-ink-3">
          The timer above is running on sample data. Starting your own needs an account.
        </p>
      )}
      {running && !isDemo && (
        <p className="text-[0.75rem] text-ink-3">
          Starting another activity stops{" "}
          <span className="font-medium">{displayCategory(running.category)}</span> at the same
          instant — no gap.
        </p>
      )}
      {error && <p className="text-[0.8125rem] text-over">{error}</p>}
    </div>
  );
}
