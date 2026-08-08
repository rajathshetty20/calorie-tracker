"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useWrite } from "./useWrite";

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
  const [kg, setKg] = useState(String(todaysWeight ?? lastWeight ?? ""));
  const [otherDay, setOtherDay] = useState(false);
  const [when, setWhen] = useState(today);
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
          measured_on: otherDay ? when : today,
          weight_kg: value,
        },
        { onConflict: "user_id,measured_on" },
      ),
    );
    if (saved) setJustSaved(true);
  }

  const replacing = !otherDay && todaysWeight !== null;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => step(-0.1)}
          aria-label="Decrease by 0.1 kg"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            required
            value={kg}
            onChange={(e) => {
              setKg(e.target.value);
              setJustSaved(false);
            }}
            placeholder="0.0"
            aria-label="Weight in kilograms"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-center text-lg font-semibold tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            kg
          </span>
        </div>
        <button
          type="button"
          onClick={() => step(0.1)}
          aria-label="Increase by 0.1 kg"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="submit"
          disabled={busy || !valid}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {busy ? "…" : "Save"}
        </button>
      </div>

      {otherDay && (
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Date
          <input
            type="date"
            value={when}
            max={today}
            onChange={(e) => setWhen(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <button
          type="button"
          onClick={() => setOtherDay((v) => !v)}
          className="text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
        >
          {otherDay ? "Log for today instead" : "Log for another day"}
        </button>
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : justSaved ? (
          <span className="text-emerald-600 dark:text-emerald-400">Saved.</span>
        ) : replacing ? (
          <span className="text-zinc-500 tabular-nums">
            Replaces {todaysWeight} kg logged today
          </span>
        ) : null}
      </div>
    </form>
  );
}
