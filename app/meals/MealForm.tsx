"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type MealPreset = {
  name: string;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
};

export default function MealForm({ presets = [] }: { presets?: MealPreset[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
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

  function applyPreset(p: MealPreset) {
    setName(p.name);
    setCarbs(String(p.carbs_g));
    setProtein(String(p.protein_g));
    setFat(String(p.fat_g));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Saving is disabled in the demo — sign in to track your own.");
      return;
    }
    const { error } = await supabase.from("meals").insert({
      user_id: userData.user.id,
      name: name || null,
      carbs_g: Number(carbs) || 0,
      protein_g: Number(protein) || 0,
      fat_g: Number(fat) || 0,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setCarbs("");
    setProtein("");
    setFat("");
    startTransition(() => router.refresh());
  }

  const showSuggestions = focused && matches.length > 0;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Meal name (optional)"
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Adding..." : "Add meal"}
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
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        placeholder="0"
      />
    </label>
  );
}
