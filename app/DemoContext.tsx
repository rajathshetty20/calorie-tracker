"use client";

import { createContext, useContext } from "react";
import Link from "next/link";

/**
 * Demo mode, known before you press anything.
 *
 * The old flow let you fill in a whole meal, tap Add, and only then said
 * saving was disabled — effort, then refusal. Worse for water: the count
 * visibly went up and then snapped back, which reads as a bug rather than a
 * boundary. Knowing up front lets controls state the constraint instead of
 * enforcing it after the fact.
 */
const DemoCtx = createContext(false);

export function DemoProvider({
  isDemo,
  children,
}: {
  isDemo: boolean;
  children: React.ReactNode;
}) {
  return <DemoCtx.Provider value={isDemo}>{children}</DemoCtx.Provider>;
}

export function useIsDemo() {
  return useContext(DemoCtx);
}

/** Stands in for a control that would write. Same footprint, honest label. */
export function SignInToSave({
  label = "Sign in to save",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href="/login"
      className={`inline-flex items-center justify-center rounded-lg border border-dashed border-rule px-3 py-2 text-[0.8125rem] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink ${className}`}
    >
      {label}
    </Link>
  );
}
