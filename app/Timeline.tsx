import { localTimeHHMM } from "@/lib/time";
import { spanMinutes } from "@/lib/time";
import { displayCategory, fmtDuration, mealCalories, plural, type Exercise, type Meal, type TimeEntry } from "@/lib/types";
import DeleteMealButton from "./meals/DeleteMealButton";
import DeleteExerciseButton from "./exercises/DeleteExerciseButton";
import TimeEntryRow from "./time/TimeEntryRow";
import { DOMAIN_COLOR, type Domain } from "./ui";

/**
 * The day as one chronological list.
 *
 * Five same-weight sections became a single stream once time entries gained
 * real timestamps — which is the order you actually lived the day in, and
 * removes the "which card was that in?" hunt.
 */
export default function Timeline({
  meals,
  exercises,
  timeEntries,
  timeZone,
}: {
  meals: Meal[];
  exercises: Exercise[];
  timeEntries: TimeEntry[];
  timeZone: string;
}) {
  type Item = { key: string; at: number; domain: Domain; node: React.ReactNode };
  const items: Item[] = [];

  for (const m of meals) {
    items.push({
      key: `meal-${m.id}`,
      at: new Date(m.created_at).getTime(),
      domain: "food",
      node: (
        <Row
          time={localTimeHHMM(new Date(m.created_at), timeZone)} domain="food"
          title={m.name || "Meal"}
          detail={`C ${Number(m.carbs_g)}g · P ${Number(m.protein_g)}g · F ${Number(m.fat_g)}g`}
          value={`${Math.round(mealCalories(m))} kcal`}
          action={<DeleteMealButton id={m.id} />} />
      ),
    });
  }

  for (const ex of exercises) {
    items.push({
      key: `ex-${ex.id}`,
      at: new Date(ex.created_at).getTime(),
      domain: "exercise",
      node: (
        <Row
          time={localTimeHHMM(new Date(ex.created_at), timeZone)} domain="exercise"
          title={ex.name}
          detail={ex.sets.map((s) => `${s.weight_kg}kg × ${s.reps}`).join(" · ")}
          value={plural(ex.sets.length, "set")}
          action={<DeleteExerciseButton id={ex.id} />} />
      ),
    });
  }

  for (const t of timeEntries) {
    const started = new Date(t.started_at);
    items.push({
      key: `time-${t.id}`,
      at: started.getTime(),
      domain: "time",
      node: (
        <div className="flex gap-3">
          <Gutter time={localTimeHHMM(started, timeZone)} domain="time" />
          <div className="min-w-0 flex-1">
            {t.ended_at ? (
              <ul>
                <TimeEntryRow entry={t} timeZone={timeZone} />
              </ul>
            ) : (
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-body">{displayCategory(t.category)}</span>
                <span className="text-[0.8125rem] font-medium text-accent-ink">running</span>
              </div>
            )}
          </div>
        </div>
      ),
    });
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[0.8125rem] text-ink-3">
        Nothing logged yet. Tap <span className="font-semibold">+</span> to start.
      </p>
    );
  }

  items.sort((a, b) => a.at - b.at);

  return (
    <div className="divide-y divide-rule-soft">
      {items.map((i) => (
        <div key={i.key}>{i.node}</div>
      ))}
    </div>
  );
}

function Gutter({ time, domain }: { time: string; domain: Domain }) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-start pt-2.5">
      <span className="tnum text-[0.6875rem] text-ink-3">{time}</span>
      <span aria-hidden="true"
 className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: DOMAIN_COLOR[domain] }} />
    </div>
  );
}

function Row({
  time,
  domain,
  title,
  detail,
  value,
  action,
}: {
  time: string;
  domain: Domain;
  title: string;
  detail?: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Gutter time={time} domain={domain} />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-body">{title}</div>
          {detail && <div className="tnum truncate text-[0.8125rem] text-ink-3">{detail}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tnum text-[0.8125rem] text-ink-2">{value}</span>
          {action}
        </div>
      </div>
    </div>
  );
}

export { spanMinutes, fmtDuration };
