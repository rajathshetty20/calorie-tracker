"use server";

import { createClient } from "@/lib/supabase/server";
import { demoData, DEMO_TIME_ZONE } from "@/lib/demo-data";
import { localDateISO } from "@/lib/time";
import type { Exercise, Meal, Settings } from "@/lib/types";

export type QuickAddData = {
  today: string;
  timeZone: string;
  bottleMl: number;
  waterMl: number;
  mealPresets: { name: string; carbs_g: number; protein_g: number; fat_g: number }[];
  exercisePresets: { name: string; sets: { weight_kg: number; reps: number }[] }[];
  timeCategories: string[];
  lastWeight: number | null;
  todaysWeight: number | null;
};

/**
 * Everything the quick-add sheet needs, fetched the first time it opens
 * rather than on every page load — the sheet lives in the layout, so eagerly
 * loading it would tax History and Settings for data they never show.
 */
export async function loadQuickAddData(): Promise<QuickAddData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dedupeMeals = (rows: Pick<Meal, "name" | "carbs_g" | "protein_g" | "fat_g">[]) => {
    const seen = new Set<string>();
    const out: QuickAddData["mealPresets"] = [];
    for (const r of rows) {
      const key = (r.name ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        name: r.name as string,
        carbs_g: Number(r.carbs_g),
        protein_g: Number(r.protein_g),
        fat_g: Number(r.fat_g),
      });
    }
    return out;
  };

  const dedupeExercises = (rows: Pick<Exercise, "name" | "sets">[]) => {
    const seen = new Set<string>();
    const out: QuickAddData["exercisePresets"] = [];
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ name: r.name, sets: r.sets });
    }
    return out;
  };

  if (!user) {
    const demo = demoData();
    const today = localDateISO(new Date(), DEMO_TIME_ZONE);
    const desc = (a: { created_at: string }, b: { created_at: string }) =>
      b.created_at.localeCompare(a.created_at);
    return {
      today,
      timeZone: DEMO_TIME_ZONE,
      bottleMl: demo.settings.bottle_ml,
      waterMl: demo.water.find((w) => w.drank_on === today)?.ml ?? 0,
      mealPresets: dedupeMeals([...demo.meals].sort(desc)),
      exercisePresets: dedupeExercises([...demo.exercises].sort(desc)),
      timeCategories: Array.from(new Set(demo.timeEntries.map((t) => t.category))),
      lastWeight: demo.weights.at(-1)?.weight_kg ?? null,
      todaysWeight: demo.weights.find((w) => w.measured_on === today)?.weight_kg ?? null,
    };
  }

  const { data: settingsRow } = await supabase.from("settings").select("*").single();
  const settings = settingsRow as Settings | null;
  const timeZone = settings?.timezone || DEMO_TIME_ZONE;
  const today = localDateISO(new Date(), timeZone);

  const [{ data: meals }, { data: exercises }, { data: times }, { data: water }, { data: weights }] =
    await Promise.all([
      supabase
        .from("meals")
        .select("name,carbs_g,protein_g,fat_g,created_at")
        .not("name", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("exercises")
        .select("name,sets,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("time_entries")
        .select("category,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("water").select("ml").eq("drank_on", today).maybeSingle(),
      supabase
        .from("weights")
        .select("measured_on,weight_kg")
        .order("measured_on", { ascending: false })
        .limit(1),
    ]);

  const weightRows = (weights ?? []) as { measured_on: string; weight_kg: number }[];
  return {
    today,
    timeZone,
    bottleMl: settings?.bottle_ml ?? 1000,
    waterMl: (water as { ml: number } | null)?.ml ?? 0,
    mealPresets: dedupeMeals((meals ?? []) as Meal[]),
    exercisePresets: dedupeExercises((exercises ?? []) as Exercise[]),
    timeCategories: Array.from(
      new Set(((times ?? []) as { category: string }[]).map((t) => t.category)),
    ),
    lastWeight: weightRows[0] ? Number(weightRows[0].weight_kg) : null,
    todaysWeight:
      weightRows[0]?.measured_on === today ? Number(weightRows[0].weight_kg) : null,
  };
}
