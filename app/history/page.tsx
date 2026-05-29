import { createClient } from "@/lib/supabase/server";
import { KCAL_PER_G, meanStd, type Meal, type Settings, type Water, type Weight } from "@/lib/types";
import HistoryChart, { type DayRow } from "./HistoryChart";
import WaterChart, { type WaterDay } from "./WaterChart";
import WeightChart from "./WeightChart";

const LOOKBACK_DAYS = 90;
const WEEK_DAYS = 7;

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

  const [{ data: meals }, { data: water }, { data: weights }, { data: settings }] =
    await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .gte("eaten_on", start)
        .lte("eaten_on", end)
        .order("eaten_on", { ascending: true }),
      supabase
        .from("water")
        .select("*")
        .gte("drank_on", start)
        .lte("drank_on", end)
        .order("drank_on", { ascending: true }),
      supabase
        .from("weights")
        .select("*")
        .order("measured_on", { ascending: true }),
      supabase.from("settings").select("*").single(),
    ]);

  const s = settings as Settings | null;
  const target = s?.target_calories ?? 2000;

  // Build a continuous date axis so missing days render as gaps / zero bars.
  const byDay = new Map<string, DayRow>();
  const waterByDay = new Map<string, WaterDay>();
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
    waterByDay.set(date, { date, litres: 0 });
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

  for (const w of (water ?? []) as Water[]) {
    const row = waterByDay.get(w.drank_on);
    if (!row) continue;
    row.litres += Number(w.ml) / 1000;
  }

  const rows = Array.from(byDay.values());
  const waterRows = Array.from(waterByDay.values());
  const weightSeries = ((weights ?? []) as Weight[]).map((w) => ({
    date: w.measured_on,
    kg: Number(w.weight_kg),
  }));

  // 7-day average + standard deviation, over days that actually have data.
  const weekCutoff = isoDaysAgo(WEEK_DAYS - 1);
  const kcalStats = meanStd(
    rows.slice(-WEEK_DAYS).filter((r) => r.total_kcal > 0).map((r) => r.total_kcal),
  );
  const waterStats = meanStd(
    waterRows.slice(-WEEK_DAYS).filter((r) => r.litres > 0).map((r) => r.litres),
  );
  const weightStats = meanStd(
    weightSeries.filter((w) => w.date >= weekCutoff).map((w) => w.kg),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-zinc-500">Calories, water, and weight.</p>
      </header>

      <HistoryChart
        rows={rows}
        target={target}
        avg7={kcalStats.n ? `${Math.round(kcalStats.mean)} kcal` : "—"}
        std7={kcalStats.n ? `±${Math.round(kcalStats.std)}` : "—"}
      />

      <WaterChart
        rows={waterRows}
        avg7={waterStats.n ? `${waterStats.mean.toFixed(1)} L` : "—"}
        std7={waterStats.n ? `±${waterStats.std.toFixed(1)}` : "—"}
      />

      <WeightChart
        data={weightSeries}
        today={end}
        avg7={weightStats.n ? `${weightStats.mean.toFixed(1)} kg` : "—"}
        std7={weightStats.n ? `±${weightStats.std.toFixed(1)}` : "—"}
      />
    </div>
  );
}
