"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { plural } from "@/lib/types";
import { DEMO_MESSAGE } from "./useWrite";
import { useIsDemo } from "./DemoContext";

const FLUSH_MS = 350;

/**
 * Water is the one control you tap several times in a row, so it doesn't use
 * useWrite: blocking during a write would drop taps.
 *
 * Instead every tap lands immediately on a local running total and a debounced
 * flush writes the final absolute value once. Rapid +++ becomes one upsert of
 * three bottles rather than three racing writes or two dropped taps.
 */
export default function WaterTracker({
  date,
  initialMl,
  bottleMl,
}: {
  date: string; // YYYY-MM-DD
  initialMl: number;
  bottleMl: number;
}) {
  const router = useRouter();
  const isDemo = useIsDemo();
  const [ml, setMl] = useState(initialMl);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // The value we intend the server to hold. Kept in a ref so a tap arriving
  // mid-flush accumulates onto the latest total rather than a stale render.
  const target = useRef(initialMl);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);

  // Adopt a fresh server value only when we have nothing outstanding —
  // otherwise a refresh issued before the last tap would roll the display
  // back, which is what made a registered tap look lost.
  useEffect(() => {
    if (timer.current === null && !flushing.current) {
      target.current = initialMl;
      setMl(initialMl);
    }
  }, [initialMl]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, FLUSH_MS);
  }

  function bump(delta: number) {
    // In demo there is nothing to flush to, so don't move the number at all —
    // an optimistic bump that snaps back a second later looks like a bug.
    if (isDemo) {
      setError("Sign in to log water — this is sample data.");
      return;
    }
    target.current = Math.max(0, target.current + delta);
    setMl(target.current); // optimistic, and never dropped
    setError(null);
    schedule();
  }

  async function flush() {
    // Serialise: the upsert stores an absolute value, so overlapping writes
    // could land out of order and stick the wrong total.
    if (flushing.current) {
      schedule();
      return;
    }
    timer.current = null;
    flushing.current = true;
    const value = target.current;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setError(DEMO_MESSAGE);
        target.current = initialMl;
        setMl(initialMl);
        return;
      }
      const { error: writeError } = await supabase.from("water").upsert(
        { user_id: data.user.id, drank_on: date, ml: value },
        { onConflict: "user_id,drank_on" },
      );
      if (writeError) {
        setError(writeError.message);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't save — check your connection.");
    } finally {
      flushing.current = false;
    }
  }

  // Bottles are display-only; the DB stores ml.
  const bottles = bottleMl > 0 ? Math.round((ml / bottleMl) * 10) / 10 : 0;

  return (
    <div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="tnum text-[1.125rem] font-semibold leading-tight">
            {(ml / 1000).toFixed(1)} L
          </div>
          <div className="tnum truncate text-[0.75rem] text-ink-3">{plural(bottles, "bottle")}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button"
            onClick={() => bump(-bottleMl)}
            disabled={ml === 0} aria-label="Remove a bottle"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rule text-ink-2 hover:bg-surface-2 disabled:opacity-30" >
            <Minus className="h-4 w-4" />
          </button>
          <button type="button"
            onClick={() => bump(bottleMl)} aria-label="Add a bottle"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "var(--water)" }} >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && <span className="text-[0.75rem] text-over">{error}</span>}
    </div>
  );
}
