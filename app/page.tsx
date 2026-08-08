import { createClient } from "@/lib/supabase/server";
import { demoData, DEMO_TIME_ZONE } from "@/lib/demo-data";
import {
  fmtDuration,
  mealCalories,
  plural,
  weeklyDelta,
  type Exercise,
  type Meal,
  type Settings,
  type TimeEntry,
  type Water,
  type WeightPoint,
  KCAL_PER_G,
} from "@/lib/types";
import { localDateISO, localDayRange } from "@/lib/time";
import { overlapsDay, totalsOnDay } from "@/lib/timeEntries";
import DateStrip from "./DateStrip";
import DemoBanner from "./DemoBanner";
import Hero from "./Hero";
import Timeline from "./Timeline";
import WaterTracker from "./WaterTracker";
import { Group } from "./ui";

type DayData = {
  isDemo: boolean;
  timeZone: string;
  today: string;
  date: string;
  meals: Meal[];
  settings: Settings | null;
  waterMl: number;
  weights: WeightPoint[];
  exercises: Exercise[];
  timeEntries: TimeEntry[];
};

// Any past day can be viewed; anything malformed or future falls back to today.
const validDate = (d: string | undefined, today: string) =>
  d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today;

async function loadDay(requested: string | undefined): Promise<DayData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const timeZone = DEMO_TIME_ZONE;
    const today = localDateISO(new Date(), timeZone);
    const date = validDate(requested, today);
    const { start: dayStart, end: dayEnd } = localDayRange(date, timeZone);
    const demo = demoData();
    const asc = (a: { created_at: string }, b: { created_at: string }) =>
      a.created_at.localeCompare(b.created_at);
    return {
      isDemo: true,
      timeZone,
      today,
      date,
      meals: demo.meals.filter((m) => m.eaten_on === date).sort(asc),
      settings: demo.settings,
      waterMl: demo.water.find((w) => w.drank_on === date)?.ml ?? 0,
      weights: [...demo.weights]
        .sort((a, b) => b.measured_on.localeCompare(a.measured_on))
        .slice(0, 30)
        .map((w) => ({ date: w.measured_on, kg: Number(w.weight_kg) })),
      exercises: demo.exercises.filter((e) => e.performed_on === date).sort(asc),
      timeEntries: demo.timeEntries.filter((t) => overlapsDay(t, dayStart, dayEnd)),
    };
  }

  // The timezone decides which calendar day "today" is, so it is resolved
  // before anything else is fetched. Without it the server's own zone (UTC on
  // Vercel) picks the day and an IST user sees yesterday until 05:30.
  const { data: settingsRow } = await supabase.from("settings").select("*").single();
  const settings = settingsRow as Settings | null;
  const timeZone = settings?.timezone || DEMO_TIME_ZONE;
  const today = localDateISO(new Date(), timeZone);
  const date = validDate(requested, today);
  const { start: dayStart, end: dayEnd } = localDayRange(date, timeZone);

  const [
    { data: meals },
    { data: waterRow },
    { data: weightRows },
    { data: exercises },
    { data: timeEntries },
  ] = await Promise.all([
    supabase.from("meals").select("*").eq("eaten_on", date).order("created_at"),
    supabase.from("water").select("ml").eq("drank_on", date).maybeSingle(),
    supabase
      .from("weights")
      .select("measured_on,weight_kg")
      .order("measured_on", { ascending: false })
      .limit(30),
    supabase.from("exercises").select("*").eq("performed_on", date).order("created_at"),
    // Overlap, not equality: one interval can belong to two days.
    supabase
      .from("time_entries")
      .select("*")
      .lt("started_at", dayEnd.toISOString())
      .or(`ended_at.is.null,ended_at.gt.${dayStart.toISOString()}`)
      .order("started_at"),
  ]);

  return {
    isDemo: false,
    timeZone,
    today,
    date,
    meals: (meals ?? []) as Meal[],
    settings,
    waterMl: (waterRow as Pick<Water, "ml"> | null)?.ml ?? 0,
    weights: ((weightRows ?? []) as { measured_on: string; weight_kg: number }[]).map((w) => ({
      date: w.measured_on,
      kg: Number(w.weight_kg),
    })),
    exercises: (exercises ?? []) as Exercise[],
    timeEntries: (timeEntries ?? []) as TimeEntry[],
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const requested = (await searchParams)?.d;
  const {
    isDemo,
    timeZone,
    today,
    date,
    meals,
    settings: s,
    waterMl,
    weights,
    exercises,
    timeEntries,
  } = await loadDay(typeof requested === "string" ? requested : undefined);

  const isToday = date === today;
  const totals = meals.reduce(
    (acc, m) => ({
      carbs: acc.carbs + Number(m.carbs_g),
      protein: acc.protein + Number(m.protein_g),
      fat: acc.fat + Number(m.fat_g),
      calories: acc.calories + mealCalories(m),
    }),
    { carbs: 0, protein: 0, fat: 0, calories: 0 },
  );

  const target = s?.target_calories ?? 2000;
  const macroTargets = s
    ? {
        carbs: Math.round((target * (s.carbs_pct / 100)) / KCAL_PER_G.carbs),
        protein: Math.round((target * (s.protein_pct / 100)) / KCAL_PER_G.protein),
        fat: Math.round((target * (s.fat_pct / 100)) / KCAL_PER_G.fat),
      }
    : { carbs: 200, protein: 150, fat: 67 };

  const dayWeight = weights.find((w) => w.date === date)?.kg ?? null;
  // Anchored to the day being viewed — otherwise every past day showed the
  // same delta, computed from today's newest weigh-in.
  const trend = weeklyDelta(weights, date);
  // The most recent weigh-in on or before this day, for context when the day
  // itself has none.
  const priorWeight = weights.find((w) => w.date <= date)?.kg ?? null;

  const dayTotals = totalsOnDay(timeEntries, date, timeZone, new Date());
  const timeTotal = Object.values(dayTotals).reduce((a, b) => a + b, 0);
  const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const entryCount = meals.length + exercises.length + timeEntries.length;

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      <DateStrip date={date} today={today} basePath={isDemo ? "/demo" : "/"} />

      <Hero
        consumed={totals.calories}
        target={target}
        macros={[
          { label: "Carbs", value: totals.carbs, target: macroTargets.carbs, color: "var(--food)" },
          {
            label: "Protein",
            value: totals.protein,
            target: macroTargets.protein,
            color: "var(--water)",
          },
          { label: "Fat", value: totals.fat, target: macroTargets.fat, color: "var(--time)" },
        ]} />

      <Group title="At a glance">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Water" domain="water">
            <WaterTracker
              key={date}
              date={date}
              initialMl={waterMl}
              bottleMl={s?.bottle_ml ?? 1000} />
          </Stat>
          <Stat label="Weight" domain="weight">
            <StatValue
              value={dayWeight !== null ? `${dayWeight} kg` : "—"}
              sub={
                dayWeight !== null
                  ? trend !== null
                    ? `${trend > 0 ? "+" : trend < 0 ? "−" : "±"}${Math.abs(trend).toFixed(1)} kg this week`
                    : "logged"
                  : priorWeight !== null
                    ? `last: ${priorWeight} kg`
                    : "not logged"
              } />
          </Stat>
          <Stat label="Exercise" domain="exercise">
            <StatValue
              value={exercises.length > 0 ? String(exercises.length) : "—"}
              sub={exercises.length > 0 ? plural(totalSets, "set") : "nothing logged"} />
          </Stat>
          <Stat label="Time" domain="time">
            <StatValue
              value={timeTotal > 0 ? fmtDuration(timeTotal) : "—"}
              sub={
                timeTotal > 0
                  ? plural(Object.keys(dayTotals).length, "category", "categories")
                  : "nothing tracked"
              } />
          </Stat>
        </div>
      </Group>

      <Group
        title={isToday ? "Today's log" : "Log"}
        meta={entryCount > 0 ? plural(entryCount, "entry", "entries") : undefined} >
        <Timeline
          meals={meals}
          exercises={exercises}
          timeEntries={timeEntries}
          timeZone={timeZone}
          date={date} />
      </Group>
    </div>
  );
}

function Stat({
  label,
  domain,
  children,
}: {
  label: string;
  domain: "water" | "weight" | "exercise" | "time";
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true"
 className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: `var(--${domain})` }} />
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-3">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function StatValue({ value, sub }: { value: string; sub: string }) {
  return (
    <div className="mt-1">
      <div className="tnum text-[1.125rem] font-semibold leading-tight">{value}</div>
      <div className="tnum truncate text-[0.75rem] text-ink-3">{sub}</div>
    </div>
  );
}
