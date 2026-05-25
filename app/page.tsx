import { createClient } from "@/lib/supabase/server";
import { mealCalories, type Meal, type Settings, KCAL_PER_G } from "@/lib/types";
import MealForm from "./meals/MealForm";
import DeleteMealButton from "./meals/DeleteMealButton";

function todayISO() {
  // Local YYYY-MM-DD
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export default async function HomePage() {
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: meals }, { data: settings }, { data: recent }] = await Promise.all([
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
  ]);

  const list = (meals ?? []) as Meal[];
  const s = settings as Settings | null;

  const seen = new Set<string>();
  const presets: { name: string; carbs_g: number; protein_g: number; fat_g: number }[] = [];
  for (const r of (recent ?? []) as Pick<Meal, "name" | "carbs_g" | "protein_g" | "fat_g">[]) {
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-zinc-500">{today}</p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {Math.round(totals.calories)}
              <span className="text-base font-normal text-zinc-500"> / {target} kcal</span>
            </div>
          </div>
          <div className="text-sm text-zinc-500 tabular-nums">
            {Math.max(0, target - Math.round(totals.calories))} left
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs_g} color="bg-amber-500" />
          <MacroBar label="Protein" value={totals.protein} target={targets.protein_g} color="bg-sky-500" />
          <MacroBar label="Fat" value={totals.fat} target={targets.fat_g} color="bg-rose-500" />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Add meal</h2>
        <MealForm presets={presets} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">Meals today</h2>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nothing logged yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {list.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
      </section>
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span className="tabular-nums">
          {Math.round(value)} / {target}g
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
