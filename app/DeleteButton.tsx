"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useWrite } from "./useWrite";

/**
 * One delete control for every kind of entry.
 *
 * A word ("Remove") beside every row crowded the phone and competed with the
 * number it sat next to. An icon carries the meaning at a glance and gives the
 * row back to its data. Still two taps — with no edit and no undo, a single
 * tap next to the calorie figure destroyed entries by accident.
 */
export default function DeleteButton({
  table,
  id,
  label,
}: {
  table: "meals" | "exercises" | "time_entries";
  id: string;
  label: string;
}) {
  const { run, busy, error } = useWrite();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (error) return <span className="text-[0.75rem] text-over">{error}</span>;

  function onClick() {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    run(({ supabase }) => supabase.from(table).delete().eq("id", id));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={armed ? `Confirm delete ${label}` : `Delete ${label}`}
      className={`-my-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
        armed ? "bg-over/12 text-over" : "text-ink-3 hover:bg-over/10 hover:text-over"
      }`}
    >
      {armed ? (
        <span className="text-[0.6875rem] font-semibold">Sure?</span>
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
