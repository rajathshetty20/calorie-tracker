import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { demoData } from "@/lib/demo-data";
import TimerBar, { type RunningTimer as Running } from "./TimerBar";

/**
 * The running timer belongs to the whole app, not to Today.
 *
 * It used to render only on the Today page, so wandering off to look at a
 * chart left a timer running with no way to stop it — which is exactly how
 * you end up with a "work" entry that ran all night.
 */
export default async function RunningTimer() {
  // The login screen stands alone; a demo timer above the sign-in form is
  // confusing and belongs to a session the visitor does not have.
  const path = (await headers()).get("x-pathname") ?? "";
  if (path.startsWith("/login")) return null;

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
  // Today is where you manage time; elsewhere the bar exists so a running
  // timer is never invisible and is always one tap from stopping.
  const compact = !(path === "/" || path === "/demo");
  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <TimerBar timer={timer} compact={compact} />
    </div>
  );
}
