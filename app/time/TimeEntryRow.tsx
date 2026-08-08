"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { displayCategory, fmtDuration } from "@/lib/types";
import {
  instantFromLocal,
  localDateISO,
  localTimeHHMM,
  spanMinutes,
  splitByDay,
} from "@/lib/time";
import { useWrite } from "../useWrite";
import EditableRow from "../EditableRow";

export type EditableEntry = {
  id: string;
  category: string;
  started_at: string;
  ended_at: string | null;
};

const NUDGES = [-15, -5, 5, 15] as const;

/**
 * A finished time entry, using the same row shell as meals and exercises so
 * every kind of entry looks and behaves alike — previously this one hid its
 * editor behind a tap on the row and showed no pencil.
 *
 * Because start and end are stored as instants and no day or duration is
 * stored, nudging a start back past midnight needs no special handling: the
 * split recomputes and the breakdown updates as you go.
 */
export default function TimeEntryRow({
  entry,
  timeZone,
  date,
}: {
  entry: EditableEntry;
  timeZone: string;
  /** The day being viewed, so a cross-midnight entry can name its share. */
  date?: string;
}) {
  const start = new Date(entry.started_at);
  const end = new Date(entry.ended_at ?? entry.started_at);
  const slices = splitByDay(start, end, timeZone);
  const share = date && slices.length > 1 ? (slices.find((s) => s.date === date)?.minutes ?? 0) : null;

  return (
    <EditableRow
      table="time_entries"
      id={entry.id}
      label="time entry"
      title={displayCategory(entry.category)}
      detail={
        <>
          {localTimeHHMM(start, timeZone)} → {localTimeHHMM(end, timeZone)}
          {slices.length > 1 && (
            <span
              className="ml-1.5 rounded bg-surface-2 px-1 py-px text-[0.625rem] font-medium text-ink-2"
              title="Crosses midnight — counted against both days"
            >
              +1d
            </span>
          )}
        </>
      }
      value={
        <>
          {fmtDuration(spanMinutes(start, end))}
          {share !== null && (
            <span className="block text-[0.6875rem]">{fmtDuration(share)} today</span>
          )}
        </>
      }
      editor={(close) => <Editor entry={entry} timeZone={timeZone} onDone={close} />}
    />
  );
}

function Editor({
  entry,
  timeZone,
  onDone,
}: {
  entry: EditableEntry;
  timeZone: string;
  onDone: () => void;
}) {
  const { run, busy, error } = useWrite();
  const [startIso, setStartIso] = useState(entry.started_at);
  const [endIso, setEndIso] = useState(entry.ended_at ?? entry.started_at);

  const start = new Date(startIso);
  const end = new Date(endIso);
  const minutes = spanMinutes(start, end);
  const slices = splitByDay(start, end, timeZone);
  const valid = end.getTime() > start.getTime();

  return (
    <div className="space-y-3">
      <Field label="Start" iso={startIso} timeZone={timeZone} onChange={setStartIso} />
      <Field label="End" iso={endIso} timeZone={timeZone} onChange={setEndIso} />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-rule pt-2 text-[0.75rem]">
        <span className="font-medium tabular-nums">
          {valid ? fmtDuration(minutes) : "End must be after start"}
        </span>
        {slices.length > 1 && (
          <span className="text-ink-3 tabular-nums">
            {slices.map((s) => `${s.date.slice(5)} ${fmtDuration(s.minutes)}`).join(" · ")}
          </span>
        )}
      </div>

      {error && <p className="text-[0.8125rem] text-over">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !valid}
          onClick={async () => {
            const ok = await run(({ supabase }) =>
              supabase
                .from("time_entries")
                .update({ started_at: start.toISOString(), ended_at: end.toISOString() })
                .eq("id", entry.id),
            );
            if (ok) onDone();
          }}
          className="rounded-lg bg-ink px-3 py-1.5 text-[0.8125rem] font-semibold text-ground hover:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-1.5 text-[0.8125rem] text-ink-2 hover:bg-surface-2"
        >
          Cancel
        </button>
      </div>
    </div>
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

  return (
    <div className="space-y-1">
      <span className="block text-[0.75rem] text-ink-3">{label}</span>
      <input
        type="datetime-local"
        value={`${date}T${time}`}
        onChange={(e) => {
          const [d, t] = e.target.value.split("T");
          if (d && t) onChange(instantFromLocal(d, t.slice(0, 5), timeZone).toISOString());
        }}
        aria-label={`${label} time`}
        className="block w-full rounded-lg border border-rule bg-surface px-2 py-2 tabular-nums outline-none focus:border-ink"
      />
      <span className="inline-flex overflow-hidden rounded-lg border border-rule">
        {NUDGES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(new Date(instant.getTime() + n * 60_000).toISOString())}
            aria-label={`${label} ${n > 0 ? "later" : "earlier"} by ${Math.abs(n)} minutes`}
            className="flex min-h-[34px] items-center gap-0.5 px-2.5 py-1 text-[0.75rem] tabular-nums text-ink-2 hover:bg-surface-2"
          >
            {n > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(n)}
          </button>
        ))}
      </span>
    </div>
  );
}
