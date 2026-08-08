"use client";

import { useEffect, useState } from "react";

/**
 * A once-a-second clock that stops when the page isn't visible.
 *
 * This is the *only* thing that runs for a stopwatch. The timer itself is a
 * stored timestamp, so elapsed time is always recomputed as now - started_at
 * and never accumulated — a tab that was suspended for nine hours shows the
 * right number on its first tick back.
 *
 * Pausing on visibilitychange means a backgrounded PWA costs nothing: no
 * wake lock, no interval, no work at all until you look at it again.
 */
export function useTicker(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id !== null) return;
      setNow(Date.now()); // resync immediately on resume
      id = setInterval(() => setNow(Date.now()), 1000);
    };
    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  return now;
}
