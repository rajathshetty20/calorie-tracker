import { Droplet, Drumstick, Wheat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { demoData } from "@/lib/demo-data";
import { displayCategory, fmtDuration, mealCalories, plural, todayISO, type Exercise, type Meal, type Settings, type TimeEntry, type Water, type Weight, KCAL_PER_G } from "@/lib/types";
import CaloriesCard from "./CaloriesCard";
import MealForm, { type MealPreset } from "./meals/MealForm";
import DeleteMealButton from "./meals/DeleteMealButton";
import ExerciseForm, { type ExercisePreset } from "./exercises/ExerciseForm";
import DeleteExerciseButton from "./exercises/DeleteExerciseButton";
import TimeForm from "./time/TimeForm";
import DeleteTimeEntryButton from "./time/DeleteTimeEntryButton";
import WaterTracker from "./WaterTracker";
import WeightForm from "./WeightForm";
import AddDisclosure from "./AddDisclosure";
import Tile from "./Tile";
import DemoBanner from "./DemoBanner";

type RecentMeal = Pick<Meal, "name" | "carbs_g" | "protein_g" | "fat_g">;
type RecentExercise = Pick<Exercise, "name" | "sets">;

type TodayData = {
  isDemo: boolean;
  meals: Meal[];
  settings: Settings | null;
  recentMeals: RecentMeal[];
  waterMl: number;
  weightKg: number | null;
  exercises: Exercise[];
  recentExercises: RecentExercise[];
  timeEntries: TimeEntry[];
  recentTimeCategories: string[];
};

async function loadToday(today: string): Promise<TodayData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Demo mode: same shapes, sample data — including recent-entry presets
    // so the autocomplete dropdowns are fully explorable. Saves are blocked
    // in the forms themselves (no session).
    const demo = demoData();
    const desc = (a: { created_at: string }, b: { created_at: string }) =>
      b.created_at.localeCompare(a.created_at);
    return {
      isDemo: true,
      meals: demo.meals.filter((m) => m.eaten_on === today).sort(desc),
      settings: demo.settings,
      recentMeals: [...demo.meals].sort(desc),
      waterMl: demo.water.find((w) => w.drank_on === today)?.ml ?? 0,
      weightKg: demo.weights.find((w) => w.measured_on === today)?.weight_kg ?? null,
      exercises: demo.exercises.filter((e) => e.performed_on === today).sort(desc),
      recentExercises: [...demo.exercises].sort(desc),
      timeEntries: demo.timeEntries.filter((t) => t.spent_on === today),
      recentTimeCategories: Array.from(new Set(demo.timeEntries.map((t) => t.category))),
    };
  }

  const [
    { data: meals },
    { data: settings },
    { data: recent },
    { data: waterRow },
    { data: weightRow },
    { data: exercises },
    { data: recentExercises },
    { data: timeEntries },
    { data: recentTime },
  ] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .eq("eaten_on", today)
        .order("created_at", { ascending: false }),
      supabase.from("settings").select("*").single(),
      supabase
        .from("meals")
        .select("name,carbs_g,protein_g,fat_g,created_at")
        .not("name", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("water").select("ml").eq("drank_on", today).maybeSingle(),
      supabase.from("weights").select("weight_kg").eq("measured_on", today).maybeSingle(),
      supabase
        .from("exercises")
        .select("*")
        .eq("performed_on", today)
        .order("created_at", { ascending: false }),
      supabase
        .from("exercises")
        .select("name,sets,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("time_entries")
        .select("*")
        .eq("spent_on", today)
        .order("created_at", { ascending: true }),
      supabase
        .from("time_entries")
        .select("category,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  return {
    isDemo: false,
    meals: (meals ?? []) as Meal[],
    settings: settings as Settings | null,
    recentMeals: (recent ?? []) as RecentMeal[],
    waterMl: (waterRow as Pick<Water, "ml"> | null)?.ml ?? 0,
    weightKg: (weightRow as Pick<Weight, "weight_kg"> | null)?.weight_kg ?? null,
    exercises: (exercises ?? []) as Exercise[],
    recentExercises: (recentExercises ?? []) as RecentExercise[],
    timeEntries: (timeEntries ?? []) as TimeEntry[],
    recentTimeCategories: Array.from(
      new Set(((recentTime ?? []) as Pick<TimeEntry, "category">[]).map((t) => t.category)),
    ),
  };
}

export default async function HomePage() {
  const today = todayISO();
  const {
    isDemo,
    meals: list,
    settings: s,
    recentMeals,
    waterMl: todaysMl,
    weightKg: todaysWeight,
    exercises: exerciseList,
    recentExercises,
    timeEntries: timeList,
    recentTimeCategories: timeCategories,
  } = await loadToday(today);

  const bottleMl = s?.bottle_ml ?? 1000;

  const seen = new Set<string>();
  const presets: MealPreset[] = [];
  for (const r of recentMeals) {
    const key = (r.name ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    presets.push({
      name: r.name as string,
      carbs_g: Number(r.carbs_g),
      protein_g: Number(r.protein_g),
      fat_g: Number(r.fat_g),
    });
  }

  const seenExercises = new Set<string>();
  const exercisePresets: ExercisePreset[] = [];
  for (const r of recentExercises) {
    const key = r.name.trim().toLowerCase();
    if (!key || seenExercises.has(key)) continue;
    seenExercises.add(key);
    exercisePresets.push({ name: r.name, sets: r.sets });
  }

  const totals = list.reduce(
    (acc, m) => ({
      carbs: acc.carbs + Number(m.carbs_g),
      protein: acc.protein + Number(m.protein_g),
      fat: acc.fat + Number(m.fat_g),
      calories: acc.calories + mealCalories(m),
    }),
    { carbs: 0, protein: 0, fat: 0, calories: 0 },
  );

  const target = s?.target_calories ?? 2000;
  const targets = s
    ? {
        carbs_g: Math.round((target * (s.carbs_pct / 100)) / KCAL_PER_G.carbs),
        protein_g: Math.round((target * (s.protein_pct / 100)) / KCAL_PER_G.protein),
        fat_g: Math.round((target * (s.fat_pct / 100)) / KCAL_PER_G.fat),
      }
    : { carbs_g: 200, protein_g: 150, fat_g: 67 };

  // Each domain's summary is computed once and shared between its glance
  // tile and its section header so the two can never disagree.
  const totalSets = exerciseList.reduce((a, ex) => a + ex.sets.length, 0);
  const setsLabel = plural(totalSets, "set");
  const exerciseSummary =
    exerciseList.length > 0 ? `${plural(exerciseList.length, "exercise")} · ${setsLabel}` : null;
  const timeTotal = timeList.reduce((a, t) => a + t.minutes, 0);
  const timeLabel = timeList.length > 0 ? fmtDuration(timeTotal) : null;
  const weightLabel = todaysWeight !== null ? `${Number(todaysWeight)} kg` : null;
  const mealsSummary = list.length > 0 ? `${Math.round(totals.calories)} kcal` : null;

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      <header>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-zinc-500">{today}</p>
      </header>

      <CaloriesCard consumed={totals.calories} target={target} />

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <MacroBar icon={Wheat} label="Carbs" value={totals.carbs} target={targets.carbs_g} color="bg-amber-500" />
          <MacroBar icon={Drumstick} label="Protein" value={totals.protein} target={targets.protein_g} color="bg-sky-500" />
          <MacroBar icon={Droplet} label="Fat" value={totals.fat} target={targets.fat_g} color="bg-rose-500" />
        </div>
      </section>

      {/* At a glance: water is tap-to-log, the rest summarize the sections below. */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Water">
          {/* Remount when the server value changes so a stale tab (other
              device, day rollover) can't upsert from an outdated total. */}
          <WaterTracker
            key={`${today}:${todaysMl}`}
            date={today}
            initialMl={todaysMl}
            bottleMl={bottleMl}
          />
        </Tile>
        <Tile label="Weight" value={weightLabel} sub={weightLabel && "logged today"} />
        <Tile
          label="Exercise"
          value={exerciseList.length > 0 ? String(exerciseList.length) : null}
          sub={exerciseList.length > 0 ? setsLabel : null}
        />
        <Tile
          label="Time"
          value={timeLabel}
          sub={timeLabel && plural(timeList.length, "category", "categories")}
        />
      </section>

      <Section title="Meals" summary={mealsSummary}>
        {list.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">
                    {m.name || "Meal"}
                  </div>
                  <div className="text-xs text-zinc-500 tabular-nums">
                    C {Number(m.carbs_g)}g · P {Number(m.protein_g)}g · F {Number(m.fat_g)}g
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums">{Math.round(mealCalories(m))} kcal</span>
                  <DeleteMealButton id={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AddDisclosure label="Add meal">
          <MealForm presets={presets} />
        </AddDisclosure>
      </Section>

      <Section title="Exercise" summary={exerciseSummary}>
        {exerciseList.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {exerciseList.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{ex.name}</div>
                  <div className="truncate text-xs text-zinc-500 tabular-nums">
                    {ex.sets.map((s) => `${s.weight_kg}kg × ${s.reps}`).join(" · ")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-zinc-500 tabular-nums">
                    {plural(ex.sets.length, "set")}
                  </span>
                  <DeleteExerciseButton id={ex.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AddDisclosure label="Log exercise">
          <ExerciseForm presets={exercisePresets} />
        </AddDisclosure>
      </Section>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <Section title="Time" summary={timeLabel && `${timeLabel} tracked`}>
          {timeList.length === 0 ? (
            <EmptyNote />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {timeList.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm">{displayCategory(t.category)}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm text-zinc-500 tabular-nums">{fmtDuration(t.minutes)}</span>
                    <DeleteTimeEntryButton id={t.id} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <AddDisclosure label="Add time">
            <TimeForm date={today} categories={timeCategories} />
          </AddDisclosure>
        </Section>

        <Section title="Weight" summary={weightLabel && `${weightLabel} today`}>
          <AddDisclosure label="Log weight">
            <WeightForm />
          </AddDisclosure>
        </Section>
      </div>
    </div>
  );
}

// Shared card shape: title left, today's total right, content below.
function Section({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-500">{title}</h2>
        {summary && <span className="text-xs text-zinc-500 tabular-nums">{summary}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyNote() {
  return <p className="text-sm text-zinc-500">Nothing logged yet.</p>;
}

function MacroBar({
  icon: Icon,
  label,
  value,
  target,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = target > 0 && value > target;
  // Label and value stack rather than sharing a row: at 375px each of the
  // three columns is ~96px, which the icon + "Protein" + "150 / 150g" cannot
  // fit side by side, and neither child can shrink.
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">
        {Math.round(value)}
        <span className="text-xs font-normal text-zinc-500"> / {target}g</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full ${over ? "bg-rose-500" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
