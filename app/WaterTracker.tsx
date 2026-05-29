"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WaterTracker({
  date,
  initialMl,
  bottleMl,
}: {
  date: string; // YYYY-MM-DD
  initialMl: number;
  bottleMl: number;
}) {
  const router = useRouter();
  const [ml, setMl] = useState(initialMl);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function setTo(nextMl: number) {
    const target = Math.max(0, nextMl);
    const previous = ml;
    setMl(target); // optimistic
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMl(previous);
      setError("Not signed in");
      return;
    }
    const { error } = await supabase.from("water").upsert(
      { user_id: userData.user.id, drank_on: date, ml: target },
      { onConflict: "user_id,drank_on" },
    );
    if (error) {
      setMl(previous);
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  // Bottles are display-only; the DB stores ml.
  const bottles = bottleMl > 0 ? Math.round((ml / bottleMl) * 10) / 10 : 0;
  const litres = ml / 1000;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setTo(ml - bottleMl)}
          disabled={pending || ml === 0}
          aria-label="Remove a bottle"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-[6.5rem] text-center text-sm tabular-nums">
          <span className="font-medium">{bottles}</span>{" "}
          <span className="text-zinc-500">
            {bottles === 1 ? "bottle" : "bottles"} · {litres.toFixed(1)} L
          </span>
        </div>
        <button
          type="button"
          onClick={() => setTo(ml + bottleMl)}
          disabled={pending}
          aria-label="Add a bottle"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-40 dark:border-sky-900 dark:text-sky-400 dark:hover:bg-sky-950/40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
