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
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="min-w-0 flex-1 text-left"
        >
          <div className="text-sm">{displayCategory(entry.category)}</div>
          <div className="text-xs text-zinc-500 tabular-nums">
            {localTimeHHMM(originalStart, timeZone)} → {localTimeHHMM(originalEnd, timeZone)}
            {crossesMidnight && (
              <span
                className="ml-1.5 rounded bg-zinc-100 px-1 py-px text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                title="Crosses midnight — counted against both days"
              >
                +1d
              </span>
            )}
          </div>
        </button>
        <span className="shrink-0 text-sm text-zinc-500 tabular-nums">
          {fmtDuration(spanMinutes(originalStart, originalEnd))}
        </span>
      </div>

      {editing && (
        <div className="mt-2 space-y-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <Field
            label="Start"
            iso={startIso}
            timeZone={timeZone}
            onChange={setStartIso}
          />
          <Field label="End" iso={endIso} timeZone={timeZone} onChange={setEndIso} />

          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-800">
            <span className="font-medium tabular-nums">
              {valid ? fmtDuration(minutes) : "End must be after start"}
            </span>
            {crossesMidnight && (
              <span className="text-zinc-500 tabular-nums">
                {slices.map((s) => `${s.date.slice(5)} ${fmtDuration(s.minutes)}`).join(" · ")}
              </span>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || !valid}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setStartIso(entry.started_at);
                setEndIso(entry.ended_at ?? entry.started_at);
                setEditing(false);
              }}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label="Delete entry"
              className="ml-auto rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
            >
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
      <span className="w-10 shrink-0 text-xs text-zinc-500">{label}</span>
      <input
        type="datetime-local"
        value={`${date}T${time}`}
        onChange={(e) => {
          const [d, t] = e.target.value.split("T");
          if (d && t) onChange(instantFromLocal(d, t.slice(0, 5), timeZone).toISOString());
        }}
        aria-label={`${label} time`}
        className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
      />
      <span className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700">
        {NUDGES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => nudge(n)}
            aria-label={`${label} ${n > 0 ? "later" : "earlier"} by ${Math.abs(n)} minutes`}
            className="flex items-center gap-0.5 px-1.5 py-1 text-[11px] tabular-nums text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {n > 0 ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
            {Math.abs(n)}
          </button>
        ))}
      </span>
    </div>
  );
}
