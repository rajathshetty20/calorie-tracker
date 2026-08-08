import { createClient } from "@/lib/supabase/server";
import { demoData } from "@/lib/demo-data";
import TimerFrame from "./TimerFrame";
import type { RunningTimer as Running } from "./TimerBar";

/**
 * The running timer belongs to the whole app, not to Today — wandering off to
 * a chart used to leave a timer running with no way to stop it.
 */
export default async function RunningTimer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let timer: Running | null = null;
  if (user) {
    const { data } = await supabase
      .from("time_entries")
      .select("id,category,started_at")
      .is("ended_at", null)
      .maybeSingle();
    timer = (data as Running | null) ?? null;
  } else {
    const live = demoData().timeEntries.find((t) => t.ended_at === null);
    timer = live ? { id: live.id, category: live.category, started_at: live.started_at } : null;
  }

  if (!timer) return null;
  return <TimerFrame timer={timer} />;
}
