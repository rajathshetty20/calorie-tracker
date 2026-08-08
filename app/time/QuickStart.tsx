"use client";

import { Play, Plus } from "lucide-react";
import { displayCategory } from "@/lib/types";
import { useWrite } from "../useWrite";
import { useAddSheet } from "../AddSheet";

// Reading the clock in the component body trips the React compiler's
// impure-call rule, and this only ever runs from a tap.
const nowIso = () => new Date().toISOString();

/**
 * One tap to start or switch a timer, on the screen you already have open.
 *
 * The timeline rewrite moved every timer control into the add sheet, which
 * put the app's most-used action three taps away. This is the chips only —
 * offsets and naming a new activity stay in the sheet, so the row stays a
 * single line instead of the stacked block it used to be.
 */
export default function QuickStart({
  categories,
  running,
}: {
  categories: string[];
  running: string | null;
}) {
  const { run, busy, error } = useWrite();
  const { open } = useAddSheet();

  if (categories.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {categories.slice(0, 4).map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy}
            onClick={() =>
              run(({ supabase }) =>
                supabase.rpc("start_timer", { p_category: c, p_started_at: nowIso() }),
              )
            }
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] transition-colors disabled:opacity-50 ${
              running === c
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-rule text-ink hover:bg-surface-2"
            }`}
          >
            <Play className="h-3 w-3 fill-current" />
            {displayCategory(c)}
          </button>
        ))}
        <button
          type="button"
          onClick={open}
          aria-label="More timer options"
          className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-dashed border-rule px-3 py-1.5 text-[0.8125rem] text-ink-3 hover:bg-surface-2"
        >
          <Plus className="h-3.5 w-3.5" />
          Other
        </button>
      </div>
      {running && (
        <p className="mt-1.5 text-[0.75rem] text-ink-3">
          Tapping another stops{" "}
          <span className="font-medium">{displayCategory(running)}</span> at the same instant.
        </p>
      )}
      {error && <p className="mt-1.5 text-[0.8125rem] text-over">{error}</p>}
    </div>
  );
}
