"use client";

import { DEMO_MESSAGE, useWrite } from "../useWrite";

export default function DeleteExerciseButton({ id }: { id: string }) {
  const { run, busy, error } = useWrite();

  if (error === DEMO_MESSAGE) {
    return <span className="text-xs text-amber-600 dark:text-amber-400">read-only</span>;
  }
  return (
    <button
      type="button"
      onClick={() =>
        run(({ supabase }) => supabase.from("exercises").delete().eq("id", id))
      }
      disabled={busy}
      aria-label="Delete exercise"
      title={error ?? undefined}
      className="-my-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
    >
      {error ? "Retry" : "Remove"}
    </button>
  );
}
