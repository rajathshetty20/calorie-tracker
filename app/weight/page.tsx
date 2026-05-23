import { createClient } from "@/lib/supabase/server";
import type { Weight } from "@/lib/types";
import WeightForm from "./WeightForm";
import WeightChart from "./WeightChart";

export default async function WeightPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("weights")
    .select("*")
    .order("measured_on", { ascending: true });

  const weights = (data ?? []) as Weight[];
  const latest = weights[weights.length - 1];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Weight</h1>
        {latest && (
          <p className="text-sm text-zinc-500">
            Latest: {Number(latest.weight_kg)} kg on {latest.measured_on}
          </p>
        )}
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Log weight</h2>
        <WeightForm />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Progress</h2>
        {weights.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No entries yet — log your first weight above.
          </p>
        ) : (
          <WeightChart
            data={weights.map((w) => ({
              date: w.measured_on,
              kg: Number(w.weight_kg),
            }))}
          />
        )}
      </section>
    </div>
  );
}
