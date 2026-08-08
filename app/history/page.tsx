import { createClient } from "@/lib/supabase/server";
import { demoData } from "@/lib/demo-data";
import { fmtDuration, isoDaysAgo, KCAL_PER_G, meanStd, type Exercise, type Meal, type Settings, type TimeEntry, type Water, type Weight } from "@/lib/types";
import { localDayRange } from "@/lib/time";
import { totalsByDay } from "@/lib/timeEntries";
import { DEMO_TIME_ZONE } from "@/lib/demo-data";
import DemoBanner from "../DemoBanner";
import HistoryChart, { type DayRow } from "./HistoryChart";
import WaterChart, { type WaterDay } from "./WaterChart";
import WeightChart from "./WeightChart";
import ExerciseChart from "./ExerciseChart";
import TimeChart, { type TimeDay } from "./TimeChart";
import { RangeProvider } from "./RangeContext";
import { parseRange } from "./range";

const LOOKBACK_DAYS = 90;
const WEEK_DAYS = 7;

type HistoryData = {
  isDemo: boolean;
  timeZone: string;
  meals: Meal[];
  water: Water[];
  weights: Weight[];
  settings: Settings | null;
  exercises: Exercise[];
  timeEntries: TimeEntry[];
};

async function loadHistory(start: string, end: string): Promise<HistoryData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const demo = demoData();
    const inRange = (d: string) => d >= start && d <= end;
    const windowStart = localDayRange(start, DEMO_TIME_ZONE).start;
    const windowEnd = localDayRange(end, DEMO_TIME_ZONE).end;
    return {
      isDemo: true,
      timeZone: DEMO_TIME_ZONE,
      meals: demo.meals.filter((m) => inRange(m.eaten_on)),
      water: demo.water.filter((w) => inRange(w.drank_on)),
      weights: demo.weights,
      settings: demo.settings,
      exercises: demo.exercises.filter((e) => inRange(e.performed_on)),
      // Intervals are filtered by overlap, not by a day column they no longer
      // have; splitByDay assigns them to days downstream.
      timeEntries: demo.timeEntries.filter(
        (t) => t.started_at < windowEnd.toISOString() &&
          (t.ended_at === null || t.ended_at > windowStart.toISOString()),
      ),
    };
  }

  // Timezone first: it decides where the day boundaries the split clips at are.
  const { data: settingsRow } = await supabase.from("settings").select("*").single();
  const settings = settingsRow as Settings | null;
  const timeZone = settings?.timezone || DEMO_TIME_ZONE;
  const windowStart = localDayRange(start, timeZone).start;
  const windowEnd = localDayRange(end, timeZone).end;

  const [
    { data: meals },
    { data: water },
    { data: weights },
    { data: exercises },
    { data: timeEntries },
  ] = await Promise.all([
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
      supabase
        .from("exercises")
        .select("*")
        .gte("performed_on", start)
        .lte("performed_on", end)
        .order("performed_on", { ascending: true }),
      supabase
        .from("time_entries")
        .select("*")
        .lt("started_at", windowEnd.toISOString())
        .or(`ended_at.is.null,ended_at.gt.${windowStart.toISOString()}`)
        .order("started_at", { ascending: true }),
    ]);

  return {
    isDemo: false,
    timeZone,
    meals: (meals ?? []) as Meal[],
    water: (water ?? []) as Water[],
    weights: (weights ?? []) as Weight[],
    settings,
    exercises: (exercises ?? []) as Exercise[],
    timeEntries: (timeEntries ?? []) as TimeEntry[],
  };
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ?range= is the initial value only; the toggle updates it client-side with
  // replaceState, since all 90 days are already loaded.
  const range = parseRange((await searchParams)?.range);
  const start = isoDaysAgo(LOOKBACK_DAYS - 1);
  const end = isoDaysAgo(0);
  const { isDemo, timeZone, meals, water, weights, settings: s, exercises, timeEntries } =
    await loadHistory(start, end);

  const target = s?.target_calories ?? 2000;

  // Build a continuous date axis so missing days render as gaps / zero bars.
  const byDay = new Map<string, DayRow>();
  const waterByDay = new Map<string, WaterDay>();
  const timeByDay = new Map<string, TimeDay>();
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
    timeByDay.set(date, { date, totals: {} });
  }

  for (const m of meals) {
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

  for (const w of water) {
    const row = waterByDay.get(w.drank_on);
    if (!row) continue;
    row.litres += Number(w.ml) / 1000;
  }

  // One interval can land on two days; splitByDay decides how much goes where.
  for (const [date, totals] of totalsByDay(timeEntries, timeZone, new Date())) {
    const row = timeByDay.get(date);
    if (!row) continue;
    row.totals = totals;
  }

  const rows = Array.from(byDay.values());
  const waterRows = Array.from(waterByDay.values());
  const timeRows = Array.from(timeByDay.values());
  const weightSeries = weights.map((w) => ({
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
  const timeStats = meanStd(
    timeRows
      .slice(-WEEK_DAYS)
      .map((r) => Object.values(r.totals).reduce((a, b) => a + b, 0))
      .filter((total) => total > 0),
  );

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      <header>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-[0.8125rem] text-ink-3">Calories, water, weight, exercise, and time.</p>
      </header>

      {/* One range for every chart below: independent toggles made
          cross-domain comparison quietly wrong. */}
      <RangeProvider initial={range}>
        <div className="space-y-6">
          <HistoryChart
            rows={rows}
            target={target}
            avg7={kcalStats.n ? `${Math.round(kcalStats.mean)} kcal` : "—"}
            std7={kcalStats.n ? `±${Math.round(kcalStats.std)}` : "—"} />

          <WaterChart
            rows={waterRows}
            avg7={waterStats.n ? `${waterStats.mean.toFixed(1)} L` : "—"}
            std7={waterStats.n ? `±${waterStats.std.toFixed(1)}` : "—"} />

          <WeightChart
            data={weightSeries}
            today={end}
            avg7={weightStats.n ? `${weightStats.mean.toFixed(1)} kg` : "—"}
            std7={weightStats.n ? `±${weightStats.std.toFixed(1)}` : "—"} />

          <ExerciseChart rows={exercises} today={end} />

          <TimeChart
            rows={timeRows}
            avg7={timeStats.n ? fmtDuration(timeStats.mean) : "—"}
            std7={timeStats.n ? `±${fmtDuration(timeStats.std)}` : "—"} />
        </div>
      </RangeProvider>
    </div>
  );
}
