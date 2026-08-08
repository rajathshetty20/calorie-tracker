"use client";

import { useMemo, useRef, useState } from "react";
import { displayCategory, fmtDuration } from "@/lib/types";
import { instantFromLocal, localDateISO, localTimeHHMM, spanMinutes } from "@/lib/time";
import { useWrite } from "../useWrite";

/**
 * Manual backfill for time you didn't run a stopwatch for. It produces the
 * same shape as a stopwatch entry — an interval — so nothing downstream has
 * to tell them apart, and both are nudged afterwards in the same editor.
 */
export default function TimeForm({
  timeZone,
  categories = [],
}: {
  timeZone: string;
  categories?: string[]; // recent categories, lowercase
}) {
  const { run, busy, error, setError } = useWrite();
  const [category, setCategory] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default to the hour just gone — that's what "I forgot to start it" means.
  const [startLocal, setStartLocal] = useState(() => localInput(Date.now() - 3_600_000, timeZone));
  const [endLocal, setEndLocal] = useState(() => localInput(Date.now(), timeZone));

  const matches = useMemo(() => {
    const q = category.trim().toLowerCase();
    return (q ? categories.filter((c) => c.includes(q)) : categories).slice(0, 8);
  }, [category, categories]);

  const start = toInstant(startLocal, timeZone);
  const end = toInstant(endLocal, timeZone);
  const minutes = start && end ? spanMinutes(start, end) : 0;
  const valid = !!start && !!end && end.getTime() > start.getTime();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cat = category.trim().toLowerCase();
    if (!cat) {
      setError("Give the entry a category.");
      return;
    }
    if (!valid) {
      setError("End must be after start.");
      return;
    }
    const ok = await run(({ supabase, userId }) =>
      supabase.from("time_entries").insert({
        user_id: userId,
        category: cat,
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
      }),
    );
    if (ok) setCategory("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="relative">
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
        {focused && matches.length > 0 && (
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

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-zinc-500">From</span>
          <input
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">To</span>
          <input
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-zinc-500">
          {valid ? fmtDuration(minutes) : "—"}
        </span>
        <button
          type="submit"
          disabled={busy || !valid}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {busy ? "…" : "Add"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

function localInput(ms: number, timeZone: string) {
  const d = new Date(ms);
  return `${localDateISO(d, timeZone)}T${localTimeHHMM(d, timeZone)}`;
}

function toInstant(value: string, timeZone: string): Date | null {
  const [d, t] = value.split("T");
  if (!d || !t) return null;
  return instantFromLocal(d, t.slice(0, 5), timeZone);
}
