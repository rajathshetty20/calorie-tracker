"use client";

import { useMemo, useRef, useState } from "react";
import { newId, useWrite } from "../useWrite";

export type MealPreset = {
  name: string;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
};

export default function MealForm({
  presets = [],
  today,
}: {
  presets?: MealPreset[];
  // The local date, resolved server-side from settings.timezone. Letting the
  // database default eaten_on to current_date would file a 1am meal against
  // the previous UTC day.
  today: string;
}) {
  const { run, busy, error } = useWrite();
  const [name, setName] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    const pool = q
      ? presets.filter((p) => p.name.toLowerCase().includes(q))
      : presets;
    return pool.slice(0, 8);
  }, [name, presets]);

  function applyPreset(p: MealPreset) {
    setName(p.name);
    setCarbs(String(p.carbs_g));
    setProtein(String(p.protein_g));
    setFat(String(p.fat_g));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const saved = await run(({ supabase, userId }) =>
      supabase.from("meals").insert({
        id: newId(),
        user_id: userId,
        eaten_on: today,
        name: name || null,
        carbs_g: Number(carbs) || 0,
        protein_g: Number(protein) || 0,
        fat_g: Number(fat) || 0,
      }),
    );
    if (!saved) return;
    setName("");
    setCarbs("");
    setProtein("");
    setFat("");
  }

  const showSuggestions = focused && matches.length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative">
        <input type="text" placeholder="Meal name (optional)"
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
 className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] outline-none focus:border-ink " />
        {showSuggestions && (
          <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-lg border border-rule bg-surface shadow-md">
            {matches.map((p) => (
              <li key={p.name}>
                <button type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyPreset(p);
                    setFocused(false);
                  }}
 className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[0.8125rem] hover:bg-surface-2" >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-[0.75rem] text-ink-3 tabular-nums">
                    C {p.carbs_g}g · P {p.protein_g}g · F {p.fat_g}g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumField label="Carbs (g)" value={carbs} onChange={setCarbs} />
        <NumField label="Protein (g)" value={protein} onChange={setProtein} />
        <NumField label="Fat (g)" value={fat} onChange={setFat} />
      </div>
      {error && <p className="text-[0.8125rem] text-over">{error}</p>}
      <button type="submit"
        disabled={busy}
 className="w-full rounded-lg bg-ink px-3 py-2 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40" >
        {busy ? "Adding..." : "Add meal"}
      </button>
    </form>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[0.75rem] text-ink-3">{label}</span>
      <input type="number"
        inputMode="decimal" step="0.1" min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
 className="mt-1 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] tabular-nums outline-none focus:border-ink " placeholder="0" />
    </label>
  );
}
