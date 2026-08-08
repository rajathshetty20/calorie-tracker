export type Meal = {
  id: string;
  user_id: string;
  eaten_on: string; // YYYY-MM-DD
  name: string | null;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  created_at: string;
};

export type Weight = {
  id: string;
  user_id: string;
  measured_on: string; // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
};

export type Water = {
  id: string;
  user_id: string;
  drank_on: string; // YYYY-MM-DD
  ml: number;
  created_at: string;
};

export type ExerciseSet = {
  weight_kg: number;
  reps: number;
};

export type Exercise = {
  id: string;
  user_id: string;
  performed_on: string; // YYYY-MM-DD
  name: string;
  sets: ExerciseSet[];
  created_at: string;
};

// Stored as an interval, never as a per-day total: an entry can straddle
// midnight, so it belongs to more than one day. See lib/time.ts#splitByDay.
export type TimeEntry = {
  id: string;
  user_id: string;
  category: string; // stored lowercase
  started_at: string; // ISO instant; may be in the future (offset start)
  ended_at: string | null; // null while the timer is running
  created_at: string;
};

export type Settings = {
  user_id: string;
  target_calories: number;
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
  bottle_ml: number;
  timezone: string; // IANA zone; day boundaries are resolved server-side
  updated_at: string;
};

// Calories per gram
export const KCAL_PER_G = { carbs: 4, protein: 4, fat: 9 } as const;

export function mealCalories(m: Pick<Meal, "carbs_g" | "protein_g" | "fat_g">) {
  return (
    m.carbs_g * KCAL_PER_G.carbs +
    m.protein_g * KCAL_PER_G.protein +
    m.fat_g * KCAL_PER_G.fat
  );
}

export function exerciseVolume(sets: ExerciseSet[]) {
  return sets.reduce((a, s) => a + s.weight_kg * s.reps, 0);
}

export function topSetWeight(sets: ExerciseSet[]) {
  return sets.reduce((a, s) => Math.max(a, s.weight_kg), 0);
}

// Estimated one-rep max (Epley), best across the day's sets.
export function estOneRepMax(sets: ExerciseSet[]) {
  return sets.reduce((a, s) => {
    const e = s.reps <= 1 ? s.weight_kg : s.weight_kg * (1 + s.reps / 30);
    return Math.max(a, e);
  }, 0);
}

export function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// "3 sets", "1 bottle" — irregular plurals pass the plural form explicitly.
export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

// Deliberately absent: isoDaysAgo()/todayISO(). They resolved days in the
// *server's* timezone, which is UTC on Vercel, so a user's day silently
// disagreed with the server's. Use localDateISO(new Date(), tz) and
// addDaysISO() from lib/time.ts, with the zone from settings.

// Categories are stored lowercase; show them with a leading capital.
export function displayCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export type WeightPoint = { date: string; kg: number };

// Change between the most recent weigh-in on or before `asOf` and the nearest
// one at least seven days older — i.e. "how much have I moved since roughly a
// week ago", not a rolling weekly average. Null without enough history.
export function weeklyDelta(points: WeightPoint[], asOf?: string): number | null {
  if (points.length < 2) return null;
  const sorted = [...points]
    .filter((p) => !asOf || p.date <= asOf)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length < 2) return null;
  const latest = sorted[0];
  const cutoff = new Date(`${latest.date}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const older = sorted.find((p) => p.date <= cutoffISO);
  if (!older) return null;
  return Math.round((latest.kg - older.kg) * 10) / 10;
}

// Mean and population standard deviation over a set of values.
export function meanStd(values: number[]): { mean: number; std: number; n: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance), n };
}
