"use client";

// A client component so rows can hand their editor down as a render function.
// Passing a function from a Server Component to a Client Component is a
// runtime error that typecheck, lint and build all miss — only loading the
// page surfaces it.
import { localTimeHHMM } from "@/lib/time";
import {
  displayCategory,
  fmtDuration,
  mealCalories,
  plural,
  type Exercise,
  type Meal,
  type TimeEntry,
} from "@/lib/types";
import EditableRow from "./EditableRow";
import MealEditor from "./meals/MealEditor";
import ExerciseEditor from "./exercises/ExerciseEditor";
import TimeEntryRow from "./time/TimeEntryRow";
import { DOMAIN_COLOR, type Domain } from "./ui";

/**
 * The day as one chronological list.
 *
 * Five same-weight sections became a single stream once time entries gained
 * real timestamps — which is the order you actually lived the day in.
 */
export default function Timeline({
  meals,
  exercises,
  timeEntries,
  timeZone,
  date,
}: {
  meals: Meal[];
  exercises: Exercise[];
  timeEntries: TimeEntry[];
  timeZone: string;
  date: string;
}) {
  type Item = { key: string; at: number; node: React.ReactNode };
  const items: Item[] = [];

  for (const m of meals) {
    const at = new Date(m.created_at);
    items.push({
      key: `meal-${m.id}`,
      at: at.getTime(),
      node: (
        <Line time={localTimeHHMM(at, timeZone)} domain="food">
          <EditableRow
            table="meals"
            id={m.id}
            label="meal"
            title={m.name || "Meal"}
            detail={`C ${Number(m.carbs_g)}g · P ${Number(m.protein_g)}g · F ${Number(m.fat_g)}g`}
            value={`${Math.round(mealCalories(m))} kcal`}
            editor={(close) => <MealEditor meal={m} onDone={close} />}
          />
        </Line>
      ),
    });
  }

  for (const ex of exercises) {
    const at = new Date(ex.created_at);
    items.push({
      key: `ex-${ex.id}`,
      at: at.getTime(),
      node: (
        <Line time={localTimeHHMM(at, timeZone)} domain="exercise">
          <EditableRow
            table="exercises"
            id={ex.id}
            label="exercise"
            title={ex.name}
            detail={ex.sets.map((s) => `${s.weight_kg}kg × ${s.reps}`).join(" · ")}
            value={plural(ex.sets.length, "set")}
            editor={(close) => <ExerciseEditor exercise={ex} onDone={close} />}
          />
        </Line>
      ),
    });
  }

  for (const t of timeEntries) {
    const started = new Date(t.started_at);
    items.push({
      key: `time-${t.id}`,
      at: started.getTime(),
      node: (
        <Line time={localTimeHHMM(started, timeZone)} domain="time">
          {t.ended_at ? (
            <TimeEntryRow entry={t} timeZone={timeZone} date={date} />
          ) : (
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-[0.9375rem]">{displayCategory(t.category)}</span>
              <span className="text-[0.8125rem] font-medium text-accent-ink">running</span>
            </div>
          )}
        </Line>
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

// Time gutter plus a domain dot, so the colour means the same thing here as
// it does in the charts and the glance tiles.
function Line({
  time,
  domain,
  children,
}: {
  time: string;
  domain: Domain;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex w-11 shrink-0 flex-col items-start pt-3">
        <span className="tnum text-[0.6875rem] text-ink-3">{time}</span>
        <span
          aria-hidden="true"
          className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: DOMAIN_COLOR[domain] }}
        />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export { fmtDuration };
