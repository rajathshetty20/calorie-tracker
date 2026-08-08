import { createClient } from "@/lib/supabase/server";
import { demoData } from "@/lib/demo-data";
import { fmtDuration, KCAL_PER_G, type Exercise, type Meal, type Settings, type TimeEntry, type Water, type Weight } from "@/lib/types";
import { addDaysISO, localDateISO, localDayRange } from "@/lib/time";
import { totalsByDay } from "@/lib/timeEntries";
import { DEMO_TIME_ZONE } from "@/lib/demo-data";
import DemoBanner from "../DemoBanner";
import HistoryChart, { type DayRow } from "./HistoryChart";
import WaterChart, { type WaterDay } from "./WaterChart";
import WeightChart from "./WeightChart";
import ExerciseChart from "./ExerciseChart";
import TimeChart, { type TimeDay } from "./TimeChart";
import { RangeProvider } from "./RangeContext";
import ChartSwitcher from "./ChartSwitcher";
import CaloriesWeightChart from "./CaloriesWeightChart";
import TrendsCard, { type Trend } from "./TrendsCard";
import { parseRange } from "./range";

const LOOKBACK_DAYS = 90;
const WEEK_DAYS = 7;

type HistoryData = {
  isDemo: boolean;
  timeZone: string;
  start: string;
  end: string;
  meals: Meal[];
  water: Water[];
  weights: Weight[];
  settings: Settings | null;
  exercises: Exercise[];
  timeEntries: TimeEntry[];
};

async function loadHistory(): Promise<HistoryData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The window has to be expressed in the user's days, not the server's.
  const windowFor = (timeZone: string) => {
    const end = localDateISO(new Date(), timeZone);
    return { start: addDaysISO(end, -(LOOKBACK_DAYS - 1)), end };
  };

  if (!user) {
    const { start, end } = windowFor(DEMO_TIME_ZONE);
    const demo = demoData();
    const inRange = (d: string) => d >= start && d <= end;
    const windowStart = localDayRange(start, DEMO_TIME_ZONE).start;
    const windowEnd = localDayRange(end, DEMO_TIME_ZONE).end;
    return {
      isDemo: true,
      timeZone: DEMO_TIME_ZONE,
      start,
      end,
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
  const { start, end } = windowFor(timeZone);
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
    start,
    end,
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
  const { isDemo, timeZone, start, end, meals, water, weights, settings: s, exercises, timeEntries } =
    await loadHistory();

  const target = s?.target_calories ?? 2000;

  // Build a continuous date axis so missing days render as gaps / zero bars.
  const byDay = new Map<string, DayRow>();
  const waterByDay = new Map<string, WaterDay>();
  const timeByDay = new Map<string, TimeDay>();
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const date = addDaysISO(start, i);
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
  const weekCutoff = addDaysISO(end, -(WEEK_DAYS - 1));

  // "Is this week different from last week?" is the first question a history
  // page should answer, before any chart is read.
  const last7 = rows.slice(-WEEK_DAYS);
  const prev7 = rows.slice(-WEEK_DAYS * 2, -WEEK_DAYS);
  const water7 = waterRows.slice(-WEEK_DAYS);
  const waterPrev = waterRows.slice(-WEEK_DAYS * 2, -WEEK_DAYS);
  const time7 = timeRows.slice(-WEEK_DAYS);
  const timePrev = timeRows.slice(-WEEK_DAYS * 2, -WEEK_DAYS);

  const avg = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const kcalAvg = (days: DayRow[]) => avg(days.filter((d) => d.total_kcal > 0).map((d) => d.total_kcal));
  const waterAvg = (days: WaterDay[]) => avg(days.filter((d) => d.litres > 0).map((d) => d.litres));
  const sleepAvg = (days: TimeDay[]) => avg(days.map((d) => d.totals.sleep ?? 0).filter((m) => m > 0));

  const kcalNow = kcalAvg(last7);
  const kcalWas = kcalAvg(prev7);
  const waterNow = waterAvg(water7);
  const waterWas = waterAvg(waterPrev);
  const sleepNow = sleepAvg(time7);
  const sleepWas = sleepAvg(timePrev);

  const weightNow = weightSeries.filter((w) => w.date >= weekCutoff).at(-1)?.kg ?? null;
  const weightWas = weightSeries.filter((w) => w.date < weekCutoff).at(-1)?.kg ?? null;

  const diff = (now: number | null, was: number | null) =>
    now !== null && was !== null ? now - was : null;

  const signed = (n: number, digits: number, unit: string) =>
    `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(digits)}${unit}`;

  const kcalDelta = diff(kcalNow, kcalWas);
  const waterDelta = diff(waterNow, waterWas);
  const sleepDelta = diff(sleepNow, sleepWas);
  const weightDelta = diff(weightNow, weightWas);

  const trends: Trend[] = [
    {
      domain: "food",
      label: "Calories",
      value: kcalNow === null ? "—" : `${Math.round(kcalNow).toLocaleString()}`,
      delta: kcalDelta,
      deltaLabel: kcalDelta === null ? "" : `${signed(Math.round(kcalDelta), 0, "")} kcal/day`,
      direction: "neutral",
    },
    {
      domain: "water",
      label: "Water",
      value: waterNow === null ? "—" : `${waterNow.toFixed(1)} L`,
      delta: waterDelta,
      deltaLabel: waterDelta === null ? "" : `${signed(waterDelta, 1, " L")}/day`,
      direction: "up-good",
    },
    {
      domain: "weight",
      label: "Weight",
      value: weightNow === null ? "—" : `${weightNow} kg`,
      delta: weightDelta,
      deltaLabel: weightDelta === null ? "" : `${signed(weightDelta, 1, " kg")}`,
      direction: "neutral",
    },
    {
      domain: "time",
      label: "Sleep",
      value: sleepNow === null ? "—" : fmtDuration(sleepNow),
      delta: sleepDelta,
      deltaLabel:
        sleepDelta === null
          ? ""
          : `${sleepDelta > 0 ? "+" : sleepDelta < 0 ? "−" : "±"}${fmtDuration(Math.abs(sleepDelta))}/night`,
      direction: "up-good",
    },
  ];

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      <header>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-[0.8125rem] text-ink-3">Calories, water, weight, exercise, and time.</p>
      </header>

      <TrendsCard
        trends={trends}
        loggedDays={last7.filter((d) => d.total_kcal > 0).length}
        totalDays={WEEK_DAYS}
      />

      {/* One range for every chart, and one chart at a time: five stacked
          charts repeated the range control five times and buried any single
          comparison under four others. */}
      <RangeProvider initial={range}>
        <ChartSwitcher
          tabs={[
            {
              key: "calories",
              label: "Calories",
              color: "var(--food)",
              node: (
                <HistoryChart key="calories" rows={rows} target={target} />
              ),
            },
            {
              key: "weight",
              label: "Weight",
              color: "var(--weight)",
              node: (
                <WeightChart key="weight" data={weightSeries} today={end} />
              ),
            },
            {
              key: "vs",
              label: "Cal vs weight",
              color: "var(--exercise)",
              node: <CaloriesWeightChart key="vs" calories={rows} weights={weightSeries} />,
            },
            {
              key: "water",
              label: "Water",
              color: "var(--water)",
              node: (
                <WaterChart key="water" rows={waterRows} />
              ),
            },
            {
              key: "exercise",
              label: "Exercise",
              color: "var(--exercise)",
              node: <ExerciseChart key="exercise" rows={exercises} today={end} />,
            },
            {
              key: "time",
              label: "Time",
              color: "var(--time)",
              node: (
                <TimeChart key="time" rows={timeRows} />
              ),
            },
          ]}
        />
      </RangeProvider>
    </div>
  );
}
