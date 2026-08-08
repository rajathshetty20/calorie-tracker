"use client";

import { useEffect, useRef, useState } from "react";
import { useWrite } from "../useWrite";
import { useIsDemo } from "../DemoContext";

export default function DeleteMealButton({ id }: { id: string }) {
  const { run, busy, error } = useWrite();
  const isDemo = useIsDemo();
  // Two taps, not one. A single tap next to the calorie figure destroyed
  // entries by accident, and there is no undo and no edit to fall back on.
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Nothing to delete in a sample dataset; offering the control only teases.
  if (isDemo) return null;

  function onClick() {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    run(({ supabase }) => supabase.from("meals").delete().eq("id", id));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={armed ? "Confirm delete meal" : "Delete meal"}
      title={error ?? undefined}
      className={`-my-1.5 min-h-[38px] rounded-lg px-2.5 py-1.5 text-[0.75rem] disabled:opacity-50 ${
        armed
          ? "bg-over/10 font-semibold text-over"
          : "text-ink-3 hover:bg-over/10 hover:text-over"
      }`}
    >
      {error ? "Retry" : armed ? "Sure?" : "Remove"}
    </button>
  );
}
