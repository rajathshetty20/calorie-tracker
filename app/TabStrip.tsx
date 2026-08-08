"use client";

import { useEffect, useRef } from "react";

/**
 * Horizontally scrolling tabs that don't hide their own contents.
 *
 * A 5-tab sheet strip measured 399px inside a 342px window and a 6-tab chart
 * strip 519px inside 378px, so the last tabs — including Time, the whole
 * stopwatch feature — were off-screen behind a swipe with no affordance. The
 * selected tab is now scrolled into view, and a fade marks that there is more.
 */
export default function TabStrip({
  activeKey,
  children,
}: {
  activeKey: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeKey]);

  return (
    <div className="relative min-w-0 flex-1">
      {/* Wraps rather than scrolls: 5 sheet tabs measured 399px inside a
          342px window, so the last one — Time, the whole stopwatch feature —
          rendered zero pixels wide with no affordance that it existed. */}
      <div ref={ref} className="-mx-1 flex flex-wrap gap-1 px-1 pb-1">
        {children}
      </div>
    </div>
  );
}
