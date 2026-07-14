"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteTimeEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onDelete() {
    const supabase = createClient();
    await supabase.from("time_entries").delete().eq("id", id);
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete time entry"
      className="-my-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
    >
      Remove
    </button>
  );
}
