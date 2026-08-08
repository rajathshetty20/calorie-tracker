"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { displayCategory, fmtDuration } from "@/lib/types";
import {
  instantFromLocal,
  localDateISO,
  localTimeHHMM,
  spanMinutes,
  splitByDay,
} from "@/lib/time";
import { useWrite } from "../useWrite";
import { useIsDemo } from "../DemoContext";

export type EditableEntry = {
  id: string;
  category: string;
  started_at: string;
  ended_at: string | null;
};

const NUDGES = [-15, -5, 5, 15] as const;

/**
 * A finished entry, with post-hoc adjustment.
 *
 * Because start and end are real instants and no day or duration is stored,
 * nudging a start back past midnight needs no special handling at all: the
 * split just recomputes, and the breakdown below updates as you go.
 */
export default function TimeEntryRow({
  entry,
  timeZone,
}: {
  entry: EditableEntry;
  timeZone: string;
}) {
  const { run, busy, error } = useWrite();
  const isDemo = useIsDemo();
  const [editing, setEditing] = useState(false);
  const [startIso, setStartIso] = useState(entry.started_at);
  const [endIso, setEndIso] = useState(entry.ended_at ?? entry.started_at);

  const start = new Date(startIso);
  const end = new Date(endIso);
  const minutes = spanMinutes(start, end);
  const slices = splitByDay(start, end, timeZone);
  const crossesMidnight = slices.length > 1;
  const valid = end.getTime() > start.getTime();

  async function save() {
    if (!valid) return;
    const ok = await run(({ supabase }) =>
      supabase
        .from("time_entries")
        .update({ started_at: start.toISOString(), ended_at: end.toISOString() })
        .eq("id", entry.id),
    );
    if (ok) setEditing(false);
  }

  async function remove() {
    await run(({ supabase }) => supabase.from("time_entries").delete().eq("id", entry.id));
  }

  const originalStart = new Date(entry.started_at);
  const originalEnd = new Date(entry.ended_at ?? entry.started_at);

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3">
        <button type="button"
          onClick={() => !isDemo && setEditing((v) => !v)}
          aria-expanded={isDemo ? undefined : editing}
          title={isDemo ? "Sign in to adjust entries" : "Adjust start and end"}
 className="min-w-0 flex-1 text-left" >
          <div className="text-[0.8125rem]">{displayCategory(entry.category)}</div>
          <div className="text-[0.75rem] text-ink-3 tabular-nums">
            {localTimeHHMM(originalStart, timeZone)} → {localTimeHHMM(originalEnd, timeZone)}
            {crossesMidnight && (
              <span
 className="ml-1.5 rounded bg-surface-2 px-1 py-px text-[10px] font-medium text-ink-2" title="Crosses midnight — counted against both days" >
                +1d
              </span>
            )}
          </div>
        </button>
        <span className="shrink-0 text-[0.8125rem] text-ink-3 tabular-nums">
          {fmtDuration(spanMinutes(originalStart, originalEnd))}
        </span>
      </div>

      {editing && (
        <div className="mt-2 space-y-3 rounded-lg border border-rule p-3">
          <Field label="Start"
            iso={startIso}
            timeZone={timeZone}
            onChange={setStartIso} />
          <Field label="End" iso={endIso} timeZone={timeZone} onChange={setEndIso} />

          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-rule pt-2 text-[0.75rem]">
            <span className="font-medium tabular-nums">
              {valid ? fmtDuration(minutes) : "End must be after start"}
            </span>
            {crossesMidnight && (
              <span className="text-ink-3 tabular-nums">
                {slices.map((s) => `${s.date.slice(5)} ${fmtDuration(s.minutes)}`).join(" · ")}
              </span>
            )}
          </div>

          {error && <p className="text-[0.8125rem] text-over">{error}</p>}

          <div className="flex items-center gap-2">
            <button type="button"
              onClick={save}
              disabled={busy || !valid}
 className="rounded-lg bg-ink px-3 py-1.5 text-[0.8125rem] font-medium text-ground hover:bg-surface-2 disabled:opacity-50" >
              Save
            </button>
            <button type="button"
              onClick={() => {
                setStartIso(entry.started_at);
                setEndIso(entry.ended_at ?? entry.started_at);
                setEditing(false);
              }}
 className="rounded-lg px-3 py-1.5 text-[0.8125rem] text-ink-2 hover:bg-surface-2" >
              Cancel
            </button>
            <button type="button"
              onClick={remove}
              disabled={busy} aria-label="Delete entry"
 className="ml-auto rounded-lg p-1.5 text-ink-3 hover:bg-red-50 hover:text-over disabled:opacity-50 dark:hover:bg-red-950/30" >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Field({
  label,
  iso,
  timeZone,
  onChange,
}: {
  label: string;
  iso: string;
  timeZone: string;
  onChange: (iso: string) => void;
}) {
  const instant = new Date(iso);
  const date = localDateISO(instant, timeZone);
  const time = localTimeHHMM(instant, timeZone);

  function nudge(minutes: number) {
    onChange(new Date(instant.getTime() + minutes * 60_000).toISOString());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-10 shrink-0 text-[0.75rem] text-ink-3">{label}</span>
      <input type="datetime-local"
        value={`${date}T${time}`}
        onChange={(e) => {
          const [d, t] = e.target.value.split("T");
          if (d && t) onChange(instantFromLocal(d, t.slice(0, 5), timeZone).toISOString());
        }}
        aria-label={`${label} time`}
 className="min-w-0 flex-1 rounded-lg border border-rule bg-surface px-2 py-1.5 text-[0.8125rem] tabular-nums outline-none focus:border-ink " />
      <span className="inline-flex overflow-hidden rounded-lg border border-rule">
        {NUDGES.map((n) => (
          <button
            key={n} type="button"
            onClick={() => nudge(n)}
            aria-label={`${label} ${n > 0 ? "later" : "earlier"} by ${Math.abs(n)} minutes`}
 className="flex items-center gap-0.5 px-1.5 py-1 text-[11px] tabular-nums text-ink-2 hover:bg-surface-2" >
            {n > 0 ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
            {Math.abs(n)}
          </button>
        ))}
      </span>
    </div>
  );
}
