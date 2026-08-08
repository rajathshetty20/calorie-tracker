"use client";

import { DEMO_MESSAGE, useWrite } from "../useWrite";

export default function DeleteMealButton({ id }: { id: string }) {
  const { run, busy, error } = useWrite();

  if (error === DEMO_MESSAGE) {
    return <span className="text-[0.75rem] text-amber-600 dark:text-amber-400">read-only</span>;
  }
  return (
    <button type="button"
      onClick={() =>
        run(({ supabase }) => supabase.from("meals").delete().eq("id", id))
      }
      disabled={busy} aria-label="Delete meal"
      title={error ?? undefined}
 className="-my-1.5 rounded-lg px-2 py-1.5 text-[0.75rem] text-ink-3 hover:bg-red-50 hover:text-over disabled:opacity-50 dark:hover:bg-red-950/30" >
      {error ? "Retry" : "Remove"}
    </button>
  );
}
