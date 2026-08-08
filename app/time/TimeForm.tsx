"use client";

import { useMemo, useRef, useState } from "react";
import { displayCategory, fmtDuration } from "@/lib/types";
import { spanMinutes } from "@/lib/time";
import { useWrite } from "../useWrite";
import DateTimeField from "./DateTimeField";

/**
 * Manual backfill for time you didn't run a stopwatch for. It produces the
 * same shape as a stopwatch entry — an interval — so nothing downstream has
 * to tell them apart, and both are nudged afterwards in the same editor.
 */
export default function TimeForm({
  timeZone,
  categories = [],
  onSaved,
}: {
  timeZone: string;
  categories?: string[]; // recent categories, lowercase
  onSaved?: () => void;
}) {
  const { run, busy, error, setError } = useWrite();
  const [category, setCategory] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default to the hour just gone — that's what "I forgot to start it" means.
  const [startIso, setStartIso] = useState(() => new Date(Date.now() - 3_600_000).toISOString());
  const [endIso, setEndIso] = useState(() => new Date().toISOString());

  const matches = useMemo(() => {
    const q = category.trim().toLowerCase();
    return (q ? categories.filter((c) => c.includes(q)) : categories).slice(0, 8);
  }, [category, categories]);

  const start = new Date(startIso);
  const end = new Date(endIso);
  const minutes = spanMinutes(start, end);
  const valid = end.getTime() > start.getTime();

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
    if (ok) {
      setCategory("");
      onSaved?.();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="relative">
        <input type="text" placeholder="Category (e.g. sleep)"
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
 className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] outline-none focus:border-ink " />
        {focused && matches.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-lg border border-rule bg-surface shadow-md">
            {matches.map((c) => (
              <li key={c}>
                <button type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCategory(c);
                    setFocused(false);
                  }}
 className="w-full px-3 py-2 text-left text-[0.8125rem] hover:bg-surface-2" >
                  {displayCategory(c)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-rule p-2">
        <DateTimeField label="From" iso={startIso} timeZone={timeZone} onChange={setStartIso} />
        <DateTimeField label="To" iso={endIso} timeZone={timeZone} onChange={setEndIso} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.75rem] tabular-nums text-ink-3">
          {valid ? fmtDuration(minutes) : "—"}
        </span>
        <button type="submit"
            disabled={busy || !valid}
   className="rounded-lg bg-ink px-4 py-2 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40" >
            {busy ? "…" : "Add"}
          </button>
      </div>
      {error && <p className="text-[0.8125rem] text-over">{error}</p>}
    </form>
  );
}


