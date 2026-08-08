"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { ExerciseSet } from "@/lib/types";
import { useWrite } from "../useWrite";

/** Adjust an exercise's sets in place. */
export default function ExerciseEditor({
  exercise,
  onDone,
}: {
  exercise: { id: string; name: string; sets: ExerciseSet[] };
  onDone: () => void;
}) {
  const { run, busy, error } = useWrite();
  const [name, setName] = useState(exercise.name);
  const [rows, setRows] = useState(
    exercise.sets.map((s) => ({ weight: String(s.weight_kg), reps: String(s.reps) })),
  );

  const field =
    "w-full rounded-lg border border-rule bg-surface px-2 py-2 tabular-nums outline-none focus:border-ink";

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise"
        className="w-full rounded-lg border border-rule bg-surface px-3 py-2 outline-none focus:border-ink"
      />
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={r.weight}
            onChange={(e) =>
              setRows(rows.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))
            }
            aria-label={`Set ${i + 1} weight`}
            className={field}
          />
          <span className="shrink-0 text-[0.8125rem] text-ink-3">kg ×</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={r.reps}
            onChange={(e) =>
              setRows(rows.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))
            }
            aria-label={`Set ${i + 1} reps`}
            className={field}
          />
          <button
            type="button"
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
            disabled={rows.length === 1}
            aria-label={`Remove set ${i + 1}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, rows[rows.length - 1] ?? { weight: "", reps: "" }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-rule px-3 py-2 text-[0.8125rem] text-ink-3 hover:bg-surface-2"
      >
        <Plus className="h-4 w-4" />
        Add set
      </button>
      {error && <p className="text-[0.8125rem] text-over">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const sets = rows
              .map((r) => ({ weight_kg: Number(r.weight) || 0, reps: Math.round(Number(r.reps)) || 0 }))
              .filter((s) => s.reps > 0);
            if (!name.trim() || sets.length === 0) return;
            const ok = await run(({ supabase }) =>
              supabase.from("exercises").update({ name: name.trim(), sets }).eq("id", exercise.id),
            );
            if (ok) onDone();
          }}
          className="rounded-lg bg-ink px-3 py-1.5 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-1.5 text-[0.8125rem] text-ink-2 hover:bg-surface-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
