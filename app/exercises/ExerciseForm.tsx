"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseSet } from "@/lib/types";

export type ExercisePreset = {
  name: string;
  sets: ExerciseSet[];
};

type SetRow = { weight: string; reps: string };
const EMPTY_ROW: SetRow = { weight: "", reps: "" };

function summary(sets: ExerciseSet[]) {
  return sets.map((s) => `${s.weight_kg}×${s.reps}`).join(" · ");
}

export default function ExerciseForm({ presets = [] }: { presets?: ExercisePreset[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [rows, setRows] = useState<SetRow[]>([EMPTY_ROW]);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    const pool = q
      ? presets.filter((p) => p.name.toLowerCase().includes(q))
      : presets;
    return pool.slice(0, 8);
  }, [name, presets]);

  // Prefill the last session's sets so logging is usually just tweaking numbers.
  function applyPreset(p: ExercisePreset) {
    setName(p.name);
    if (p.sets.length > 0) {
      setRows(p.sets.map((s) => ({ weight: String(s.weight_kg), reps: String(s.reps) })));
    }
  }

  function updateRow(i: number, patch: Partial<SetRow>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    // Copy the previous set — the common case is repeating the same weight.
    setRows((rs) => [...rs, rs.length > 0 ? { ...rs[rs.length - 1] } : EMPTY_ROW]);
  }

  function removeRow(i: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the exercise a name.");
      return;
    }
    const sets: ExerciseSet[] = rows
      .map((r) => ({ weight_kg: Number(r.weight) || 0, reps: Math.round(Number(r.reps)) || 0 }))
      .filter((s) => s.reps > 0);
    if (sets.length === 0) {
      setError("Add at least one set with reps.");
      return;
    }
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Saving is disabled in the demo — sign in to track your own.");
      return;
    }
    const { error } = await supabase.from("exercises").insert({
      user_id: userData.user.id,
      name: trimmed,
      sets,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setRows([EMPTY_ROW]);
    startTransition(() => router.refresh());
  }

  const showSuggestions = focused && matches.length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
            {matches.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyPreset(p);
                    setFocused(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                    {summary(p.sets)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-zinc-500 tabular-nums">Set {i + 1}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="Weight (kg)"
              value={r.weight}
              onChange={(e) => updateRow(i, { weight: e.target.value })}
              className="w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
            />
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              placeholder="Reps"
              value={r.reps}
              onChange={(e) => updateRow(i, { reps: e.target.value })}
              className="w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              aria-label={`Remove set ${i + 1}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-600 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
      >
        + Add set
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Logging..." : "Log exercise"}
      </button>
    </form>
  );
}
