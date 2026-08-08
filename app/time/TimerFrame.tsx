"use client";

import { usePathname } from "next/navigation";
import TimerBar, { type RunningTimer } from "./TimerBar";

/**
 * Decides where the running-timer bar appears.
 *
 * This used to be resolved server-side from an x-pathname header set in the
 * proxy, but NextResponse.next({ request }) does not reliably forward mutated
 * request headers, so the header arrived empty and the bar rendered on the
 * sign-in screen. usePathname is the same mechanism TopBar already uses to
 * hide itself there, and it cannot silently fail.
 */
export default function TimerFrame({ timer }: { timer: RunningTimer }) {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  // Today is where you manage time; elsewhere the bar exists so a running
  // timer is never invisible and is always one tap from stopping.
  const compact = !(pathname === "/" || pathname === "/demo");

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <TimerBar timer={timer} compact={compact} />
    </div>
  );
}
