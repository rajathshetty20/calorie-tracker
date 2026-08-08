"use client";

import { instantFromLocal, localDateISO, localTimeHHMM } from "@/lib/time";

/**
 * A date box and a time box, rather than one datetime-local.
 *
 * datetime-local renders very differently across platforms — Chrome draws a
 * wide text field showing "09/08/2026, 04:45 AM", iOS Safari draws its own
 * compact control — so its width could not be reasoned about or tested
 * reliably, and it overflowed on real devices. Two native inputs are narrower,
 * predictable everywhere, and each opens the picker you'd expect.
 */
export default function DateTimeField({
  label,
  iso,
  timeZone,
  onChange,
  max,
}: {
  label: string;
  iso: string;
  timeZone: string;
  onChange: (iso: string) => void;
  max?: string;
}) {
  const instant = new Date(iso);
  const date = localDateISO(instant, timeZone);
  const time = localTimeHHMM(instant, timeZone);

  const set = (d: string, t: string) => onChange(instantFromLocal(d, t, timeZone).toISOString());

  const cls =
    "min-w-0 rounded-lg border border-rule bg-surface px-2 py-1.5 tabular-nums outline-none focus:border-ink";

  return (
    <div className="space-y-1">
      <span className="block text-[0.75rem] text-ink-3">{label}</span>
      {/* Both fields claim a minimum width and wrap instead of shrinking:
          squeezed, a 12-hour time input clipped its meridiem and rendered
          "10:15 PN". Form controls clip internally, so this never shows up
          as scrollWidth overflow — only by looking. */}
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={date}
          max={max}
          onChange={(e) => e.target.value && set(e.target.value, time)}
          aria-label={`${label} date`}
          className={`${cls} min-w-[8.5rem] flex-1`}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => e.target.value && set(date, e.target.value)}
          aria-label={`${label} time`}
          className={`${cls} min-w-[8.5rem] flex-1`}
        />
      </div>
    </div>
  );
}
