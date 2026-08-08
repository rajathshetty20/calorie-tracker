"use client";

import { useState } from "react";
import { useWrite } from "../useWrite";

/** Correct a meal in place, instead of deleting and retyping it. */
export default function MealEditor({
  meal,
  onDone,
}: {
  meal: { id: string; name: string | null; carbs_g: number; protein_g: number; fat_g: number };
  onDone: () => void;
}) {
  const { run, busy, error } = useWrite();
  const [name, setName] = useState(meal.name ?? "");
  const [c, setC] = useState(String(Number(meal.carbs_g)));
  const [p, setP] = useState(String(Number(meal.protein_g)));
  const [f, setF] = useState(String(Number(meal.fat_g)));

  const field =
    "w-full min-w-0 rounded-lg border border-rule bg-surface px-2 py-1.5 tabular-nums outline-none focus:border-ink";

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Meal name"
        className="w-full rounded-lg border border-rule bg-surface px-2.5 py-1.5 outline-none focus:border-ink"
      />
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Carbs", c, setC],
          ["Protein", p, setP],
          ["Fat", f, setF],
        ].map(([label, val, set]) => (
          <label key={label as string} className="block">
            <span className="text-[0.75rem] text-ink-3">{label as string} (g)</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={val as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value)}
              className={`mt-1 ${field}`}
            />
          </label>
        ))}
      </div>
      {error && <p className="text-[0.8125rem] text-over">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await run(({ supabase }) =>
              supabase
                .from("meals")
                .update({
                  name: name.trim() || null,
                  carbs_g: Number(c) || 0,
                  protein_g: Number(p) || 0,
                  fat_g: Number(f) || 0,
                })
                .eq("id", meal.id),
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
