"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { displayCategory } from "@/lib/types";

export default function TimeForm({
  date,
  categories = [],
}: {
  date: string; // YYYY-MM-DD, from the server
  categories?: string[]; // recent categories, lowercase
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = category.trim().toLowerCase();
    const pool = q ? categories.filter((c) => c.includes(q)) : categories;
    return pool.slice(0, 8);
  }, [category, categories]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const cat = category.trim().toLowerCase();
    if (!cat) {
      setError("Give the entry a category.");
      return;
    }
    const minutes = (Math.round(Number(hours) * 60) || 0) + (Math.round(Number(mins)) || 0);
    if (minutes <= 0) {
      setError("Add a duration.");
      return;
    }
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Saving is disabled in the demo — sign in to track your own.");
      return;
    }
    // One row per day+category: saving the same category again replaces it.
    const { error } = await supabase.from("time_entries").upsert(
      { user_id: userData.user.id, spent_on: date, category: cat, minutes },
      { onConflict: "user_id,spent_on,category" },
    );
    if (error) {
      setError(error.message);
      return;
    }
    setCategory("");
    setHours("");
    setMins("");
    startTransition(() => router.refresh());
  }

  const showSuggestions = focused && matches.length > 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-2">
      <div className="relative min-w-0 flex-1 basis-40">
        <input
          type="text"
          placeholder="Category (e.g. sleep)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 120);
          }}
          autoComplete="off"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        />
        {showSuggestions && (
          <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900">
            {matches.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCategory(c);
                    setFocused(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {displayCategory(c)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        type="number"
        inputMode="numeric"
        step="1"
        min="0"
        placeholder="h"
        aria-label="Hours"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        className="w-16 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
      <input
        type="number"
        inputMode="numeric"
        step="5"
        min="0"
        max="59"
        placeholder="m"
        aria-label="Minutes"
        value={mins}
        onChange={(e) => setMins(e.target.value)}
        className="w-16 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "..." : "Add"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
