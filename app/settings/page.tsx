import { createClient } from "@/lib/supabase/server";
import { demoData } from "@/lib/demo-data";
import type { Settings } from "@/lib/types";
import DemoBanner from "../DemoBanner";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let settings: Settings | null;
  if (user) {
    const { data } = await supabase.from("settings").select("*").single();
    settings = data;
  } else {
    settings = demoData().settings;
  }

  return (
    <div className="space-y-6">
      {!user && <DemoBanner />}

      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">Daily target, macro split, bottle size, and timezone.</p>
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
              timezone: "Asia/Kolkata",
            }
          }
        />
      </section>
    </div>
  );
}
