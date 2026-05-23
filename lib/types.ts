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

export type Settings = {
  user_id: string;
  target_calories: number;
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
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
