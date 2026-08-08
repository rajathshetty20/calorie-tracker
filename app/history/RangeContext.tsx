"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Range } from "./range";

type RangeState = { range: Range; setRange: (r: Range) => void };
const RangeCtx = createContext<RangeState | null>(null);

/**
 * One range for the whole page.
 *
 * Each chart used to own its own toggle, so setting 90d on Calories left the
 * others at 30d and any comparison between them was quietly wrong.
 *
 * The URL is updated with replaceState rather than a router navigation: the
 * data for all 90 days is already on the client, so re-rendering is instant
 * and a server round trip would only add latency. The ?range= parameter is
 * there so a reload or a shared link lands on the same view.
 */
export function RangeProvider({
  initial,
  children,
}: {
  initial: Range;
  children: React.ReactNode;
}) {
  const [range, set] = useState<Range>(initial);

  const setRange = useCallback((next: Range) => {
    set(next);
    const url = new URL(window.location.href);
    url.searchParams.set("range", String(next));
    window.history.replaceState(null, "", url);
  }, []);

  return <RangeCtx.Provider value={{ range, setRange }}>{children}</RangeCtx.Provider>;
}

export function useRange(): RangeState {
  const ctx = useContext(RangeCtx);
  if (!ctx) throw new Error("useRange must be used inside a RangeProvider");
  return ctx;
}
