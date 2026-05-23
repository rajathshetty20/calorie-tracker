"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KCAL_PER_G } from "@/lib/types";

type Initial = {
  target_calories: number;
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
};

export default function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState(String(initial.target_calories));
  const [carbs, setCarbs] = useState(String(initial.carbs_pct));
  const [protein, setProtein] = useState(String(initial.protein_pct));
  const [fat, setFat] = useState(String(initial.fat_pct));
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const c = Number(carbs) || 0;
  const p = Number(protein) || 0;
  const f = Number(fat) || 0;
  const sum = c + p + f;
  const t = Number(target) || 0;

  const grams = {
    carbs: Math.round((t * (c / 100)) / KCAL_PER_G.carbs),
    protein: Math.round((t * (p / 100)) / KCAL_PER_G.protein),
    fat: Math.round((t * (f / 100)) / KCAL_PER_G.fat),
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (sum !== 100) {
      setMsg({ kind: "err", text: `Macros must sum to 100% (currently ${sum}%).` });
      return;
    }
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMsg({ kind: "err", text: "Not signed in" });
      return;
    }
    const { error } = await supabase.from("settings").upsert({
      user_id: userData.user.id,
      target_calories: t,
      carbs_pct: c,
      protein_pct: p,
      fat_pct: f,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setMsg({ kind: "err", text: error.message });
      return;
    }
    setMsg({ kind: "ok", text: "Saved." });
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs text-zinc-500">Daily calories target</span>
        <input
          type="number"
          min="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <PctField label="Carbs %" value={carbs} grams={grams.carbs} onChange={setCarbs} />
        <PctField label="Protein %" value={protein} grams={grams.protein} onChange={setProtein} />
        <PctField label="Fat %" value={fat} grams={grams.fat} onChange={setFat} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={sum === 100 ? "text-emerald-600" : "text-amber-600"}>
          Total: {sum}%
        </span>
        {msg && (
          <span className={msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}>
            {msg.text}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

function PctField({
  label,
  value,
  grams,
  onChange,
}: {
  label: string;
  value: string;
  grams: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
      <span className="mt-1 block text-xs text-zinc-500 tabular-nums">≈ {grams}g</span>
    </label>
  );
}
