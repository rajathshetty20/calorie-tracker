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

export type Settings = {
  user_id: string;
  target_calories: number;
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
  bottle_ml: number;
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

// Mean and population standard deviation over a set of values.
export function meanStd(values: number[]): { mean: number; std: number; n: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance), n };
}
