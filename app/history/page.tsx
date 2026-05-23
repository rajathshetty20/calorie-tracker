import { createClient } from "@/lib/supabase/server";
import { KCAL_PER_G, type Meal, type Settings } from "@/lib/types";
import HistoryChart, { type DayRow } from "./HistoryChart";

const LOOKBACK_DAYS = 90;

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const start = isoDaysAgo(LOOKBACK_DAYS - 1);
  const end = isoDaysAgo(0);

  const [{ data: meals }, { data: settings }] = await Promise.all([
    supabase
      .from("meals")
      .select("*")
      .gte("eaten_on", start)
      .lte("eaten_on", end)
      .order("eaten_on", { ascending: true }),
    supabase.from("settings").select("*").single(),
  ]);

  const s = settings as Settings | null;
  const target = s?.target_calories ?? 2000;

  // Build a continuous date axis so missing days render as gaps.
  const byDay = new Map<string, DayRow>();
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const date = isoDaysAgo(LOOKBACK_DAYS - 1 - i);
    byDay.set(date, {
      date,
      carbs_g: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_kcal: 0,
      protein_kcal: 0,
      fat_kcal: 0,
      total_kcal: 0,
    });
  }

  for (const m of (meals ?? []) as Meal[]) {
    const row = byDay.get(m.eaten_on);
    if (!row) continue;
    const c = Number(m.carbs_g);
    const p = Number(m.protein_g);
    const f = Number(m.fat_g);
    row.carbs_g += c;
    row.protein_g += p;
    row.fat_g += f;
    row.carbs_kcal += c * KCAL_PER_G.carbs;
    row.protein_kcal += p * KCAL_PER_G.protein;
    row.fat_kcal += f * KCAL_PER_G.fat;
    row.total_kcal += c * KCAL_PER_G.carbs + p * KCAL_PER_G.protein + f * KCAL_PER_G.fat;
  }

  const rows = Array.from(byDay.values());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-zinc-500">Daily calories and macros.</p>
      </header>

      <HistoryChart rows={rows} target={target} />
    </div>
  );
}
