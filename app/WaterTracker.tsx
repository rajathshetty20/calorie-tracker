"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { plural } from "@/lib/types";
import { TileBody } from "./Tile";

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
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function setTo(nextMl: number) {
    // Serialize writes: the upsert stores an absolute value, so concurrent
    // requests landing out of order would drop taps.
    if (busy) return;
    setBusy(true);
    const target = Math.max(0, nextMl);
    const previous = ml;
    setMl(target); // optimistic
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMl(previous);
        setError("Demo — saving disabled");
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
    } finally {
      setBusy(false);
    }
  }

  // Bottles are display-only; the DB stores ml.
  const bottles = bottleMl > 0 ? Math.round((ml / bottleMl) * 10) / 10 : 0;
  const litres = ml / 1000;
  const disabled = busy || pending;

  return (
    <div>
      <TileBody
        value={`${litres.toFixed(1)} L`}
        sub={plural(bottles, "bottle")}
        actions={
          <>
            <button
              type="button"
              onClick={() => setTo(ml - bottleMl)}
              disabled={disabled || ml === 0}
              aria-label="Remove a bottle"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTo(ml + bottleMl)}
              disabled={disabled}
              aria-label="Add a bottle"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-300 text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-40 dark:border-sky-900 dark:text-sky-400 dark:hover:bg-sky-950/40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </>
        }
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
