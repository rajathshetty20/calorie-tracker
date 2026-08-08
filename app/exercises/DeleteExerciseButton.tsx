"use client";

import { useWrite } from "../useWrite";
import { useIsDemo } from "../DemoContext";

export default function DeleteExerciseButton({ id }: { id: string }) {
  const { run, busy, error } = useWrite();
  const isDemo = useIsDemo();

  // Nothing to delete in a sample dataset; offering the control only teases.
  if (isDemo) return null;

  return (
    <button type="button"
      onClick={() =>
        run(({ supabase }) => supabase.from("exercises").delete().eq("id", id))
      }
      disabled={busy} aria-label="Delete exercise"
      title={error ?? undefined}
 className="-my-1.5 rounded-lg px-2 py-1.5 text-[0.75rem] text-ink-3 hover:bg-red-50 hover:text-over disabled:opacity-50 dark:hover:bg-red-950/30" >
      {error ? "Retry" : "Remove"}
    </button>
  );
}
