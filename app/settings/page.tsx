import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").single();

  const settings: Settings | null = data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">Daily target, macro split, and water bottle size.</p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <SettingsForm
          initial={
            settings ?? {
              target_calories: 2000,
              carbs_pct: 40,
              protein_pct: 30,
              fat_pct: 30,
              bottle_ml: 1000,
            }
          }
        />
      </section>
    </div>
  );
}
