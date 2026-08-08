"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useWrite } from "./useWrite";
import { SignInToSave, useIsDemo } from "./DemoContext";

// Weighing yourself is a two-tap job: the number barely moves day to day, so
// the field arrives prefilled with your last reading and the steppers cover
// the usual ±0.1–0.5 kg. The date picker is the rare case and stays folded.
export default function WeightForm({
  today,
  todaysWeight,
  lastWeight,
}: {
  today: string; // YYYY-MM-DD, from the server
  todaysWeight: number | null;
  lastWeight: number | null;
}) {
  const { run, busy, error } = useWrite();
  const isDemo = useIsDemo();
  const [kg, setKg] = useState(String(todaysWeight ?? lastWeight ?? ""));
  const [justSaved, setJustSaved] = useState(false);

  const value = Number(kg);
  const valid = kg.trim() !== "" && Number.isFinite(value) && value > 0;

  function step(delta: number) {
    const base = Number.isFinite(value) && value > 0 ? value : (lastWeight ?? 70);
    setKg((Math.round((base + delta) * 10) / 10).toFixed(1));
    setJustSaved(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    const saved = await run(({ supabase, userId }) =>
      supabase.from("weights").upsert(
        {
          user_id: userId,
          measured_on: today,
          weight_kg: value,
        },
        { onConflict: "user_id,measured_on" },
      ),
    );
    if (saved) setJustSaved(true);
  }

  const replacing = todaysWeight !== null;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={() => step(-0.1)} aria-label="Decrease by 0.1 kg"
 className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rule text-ink-2 hover:bg-surface-2" >
          <Minus className="h-4 w-4" />
        </button>
        <div className="relative min-w-0 flex-1">
          <input type="number"
            inputMode="decimal" step="any" min="0"
            required
            value={kg}
            onChange={(e) => {
              setKg(e.target.value);
              setJustSaved(false);
            }} placeholder="0.0" aria-label="Weight in kilograms"
 className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-center text-lg font-semibold tabular-nums outline-none focus:border-ink " />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] text-ink-3">
            kg
          </span>
        </div>
        <button type="button"
          onClick={() => step(0.1)} aria-label="Increase by 0.1 kg"
 className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rule text-ink-2 hover:bg-surface-2" >
          <Plus className="h-4 w-4" />
        </button>
        {isDemo ? (
          <SignInToSave label="Sign in to save" className="shrink-0" />
        ) : (
          <button type="submit"
            disabled={busy || !valid}
   className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-[0.8125rem] font-medium text-ground hover:opacity-90 disabled:opacity-40" >
            {busy ? "…" : "Save"}
          </button>
        )}
      </div>

      <div className="min-h-[1.1rem] text-[0.75rem]">
        {error ? (
          <span className="text-over">{error}</span>
        ) : justSaved ? (
          <span className="text-emerald-600 dark:text-emerald-400">Saved.</span>
        ) : replacing ? (
          <span className="text-ink-3 tabular-nums">
            Replaces {todaysWeight} kg logged today
          </span>
        ) : null}
      </div>
    </form>
  );
}
