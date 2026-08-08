"use client";

import { Square } from "lucide-react";
import { displayCategory, fmtDuration } from "@/lib/types";
import { fmtClock } from "@/lib/time";
import { useWrite } from "../useWrite";
import { useTicker } from "./useTicker";
import { useIsDemo } from "../DemoContext";

export type RunningTimer = { id: string; category: string; started_at: string };

/**
 * The one element that stays on screen while you're not interacting with the
 * app. Only one timer can run, so this is a single fixed-height bar rather
 * than a stack — which is what makes it cheap to keep on every page.
 *
 * An offset start reads as a countdown until it fires, then rolls over into
 * counting up. Same row, same timestamp, no scheduling anywhere.
 */
export default function TimerBar({
  timer,
  compact = false,
}: {
  timer: RunningTimer;
  compact?: boolean;
}) {
  const { run, busy, error, setError } = useWrite();
  const isDemo = useIsDemo();
  const now = useTicker(true);

  const startedAt = new Date(timer.started_at).getTime();
  const elapsed = now - startedAt;
  const pending = elapsed < 0;

  async function stop() {
    // A disabled button with a title attribute is invisible on touch, so the
    // demo read as "Stop is broken". Say it in the bar instead.
    if (isDemo) {
      setError("Sign in to stop timers — this one is sample data.");
      return;
    }
    // An offset start that has not fired yet has no elapsed time, so
    // "stopping" it means cancelling it. Writing ended_at = now() there would
    // be earlier than started_at and violate the interval check.
    await run(({ supabase }) =>
      pending
        ? supabase.from("time_entries").delete().eq("id", timer.id)
        : supabase
            .from("time_entries")
            .update({ ended_at: new Date().toISOString() })
            .eq("id", timer.id),
    );
  }

  return (
    <div className={`sticky top-0 z-20 -mx-4 mb-2 border-b border-emerald-200 bg-emerald-50/95 px-4 backdrop-blur ${compact ? "py-1.5" : "py-2.5"} dark:border-emerald-900/60 dark:bg-emerald-950/70`}>
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          {!pending && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
          )}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.8125rem] font-medium text-emerald-900 dark:text-emerald-100">
            {displayCategory(timer.category)}
          </div>
          {error && <div className="truncate text-[0.75rem] text-over">{error}</div>}
        </div>

        <span
 className="shrink-0 text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-100" aria-live="off" >
          {pending ? `−${fmtClock(elapsed)}` : fmtClock(elapsed)}
        </span>

        <button type="button"
          onClick={stop}
          disabled={busy}
 className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[0.8125rem] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60" >
          <Square className="h-3 w-3 fill-current" />
          {pending ? "Cancel" : "Stop"}
        </button>
      </div>
      {!compact && (
        <div className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
          {pending
            ? `Starts in ${fmtClock(elapsed)} — the clock begins at zero then.`
            : `Running · ${fmtDuration(Math.floor(elapsed / 60_000))} so far`}
        </div>
      )}
    </div>
  );
}
