"use client";

import { useState, useSyncExternalStore } from "react";
import { KCAL_PER_G } from "@/lib/types";
import { useWrite } from "../useWrite";

type Initial = {
  target_calories: number;
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
  bottle_ml: number;
  timezone: string;
};

const COMMON_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

const subscribeNever = () => () => {};
const readDeviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
const readNothing = () => "";

function isValidZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export default function SettingsForm({ initial }: { initial: Initial }) {
  // The device's zone is client-only knowledge. useSyncExternalStore lets the
  // server render an empty snapshot and the client fill it in, without an
  // effect and without a hydration mismatch.
  const detected = useSyncExternalStore(subscribeNever, readDeviceZone, readNothing);
  const { run, busy, error } = useWrite();
  const [target, setTarget] = useState(String(initial.target_calories));
  const [carbs, setCarbs] = useState(String(initial.carbs_pct));
  const [protein, setProtein] = useState(String(initial.protein_pct));
  const [fat, setFat] = useState(String(initial.fat_pct));
  const [bottleMl, setBottleMl] = useState(String(initial.bottle_ml));
  const [timezone, setTimezone] = useState(initial.timezone);
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
    const ml = Math.round(Number(bottleMl));
    if (!(ml > 0)) {
      setMsg({ kind: "err", text: "Millilitres per bottle must be greater than 0." });
      return;
    }
    if (!isValidZone(timezone)) {
      setMsg({ kind: "err", text: `"${timezone}" is not a recognised timezone.` });
      return;
    }
    const saved = await run(({ supabase, userId }) =>
      supabase.from("settings").upsert({
        user_id: userId,
        target_calories: t,
        carbs_pct: c,
        protein_pct: p,
        fat_pct: f,
        bottle_ml: ml,
        timezone,
        updated_at: new Date().toISOString(),
      }),
    );
    if (saved) setMsg({ kind: "ok", text: "Saved." });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-[0.75rem] text-ink-3">Daily calories target</span>
        <input type="number" min="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
 className="mt-1 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] tabular-nums outline-none focus:border-ink " />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <PctField label="Carbs %" value={carbs} grams={grams.carbs} onChange={setCarbs} />
        <PctField label="Protein %" value={protein} grams={grams.protein} onChange={setProtein} />
        <PctField label="Fat %" value={fat} grams={grams.fat} onChange={setFat} />
      </div>

      <div className="flex items-center justify-between text-[0.75rem]">
        <span className={sum === 100 ? "text-emerald-600" : "text-amber-600"}>
          Total: {sum}%
        </span>
        {/* Write failures come from useWrite; validation and success from msg. */}
        {error ? (
          <span className="text-over">{error}</span>
        ) : msg ? (
          <span className={msg.kind === "ok" ? "text-emerald-600" : "text-over"}>
            {msg.text}
          </span>
        ) : null}
      </div>

      <label className="block border-t border-rule pt-4">
        <span className="text-[0.75rem] text-ink-3">Millilitres per water bottle</span>
        <input type="number"
          inputMode="numeric" step="50" min="1"
          value={bottleMl}
          onChange={(e) => setBottleMl(e.target.value)}
 className="mt-1 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] tabular-nums outline-none focus:border-ink " />
        <span className="mt-1 block text-[0.75rem] text-ink-3">
          One tap on the Today page logs this much water.
        </span>
      </label>

      <label className="block border-t border-rule pt-4">
        <span className="text-[0.75rem] text-ink-3">Timezone</span>
        <input type="text"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value.trim())} list="tz-suggestions"
          spellCheck={false}
 className="mt-1 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] outline-none focus:border-ink " />
        <datalist id="tz-suggestions">
          {COMMON_ZONES.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        <span className="mt-1 block text-[0.75rem] text-ink-3">
          Decides where your day starts and ends — including how an entry that
          crosses midnight is divided between two days.
          {detected && detected !== timezone && (
            <>
              {" "}
              <button type="button"
                onClick={() => setTimezone(detected)}
 className="underline underline-offset-2" >
                Use this device&apos;s zone ({detected})
              </button>
            </>
          )}
        </span>
      </label>

      <button type="submit"
        disabled={busy}
 className="w-full rounded-lg bg-ink px-3 py-2 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40" >
        {busy ? "Saving..." : "Save"}
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
      <span className="text-[0.75rem] text-ink-3">{label}</span>
      <input type="number" min="0" max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
 className="mt-1 w-full rounded-lg border border-rule bg-surface px-3 py-2 text-[0.8125rem] tabular-nums outline-none focus:border-ink " />
      <span className="mt-1 block text-[0.75rem] text-ink-3 tabular-nums">≈ {grams}g</span>
    </label>
  );
}
