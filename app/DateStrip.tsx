import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO } from "@/lib/time";
import AddEntryButton from "./AddEntryButton";

// Any day can be reviewed, not just today — the previous version could only
// ever show the current date, so a forgotten dinner was unreachable.
export default function DateStrip({
  date,
  today,
  basePath,
}: {
  date: string;
  today: string;
  basePath: string;
}) {
  const prev = addDaysISO(date, -1);
  const next = addDaysISO(date, 1);
  const isToday = date === today;
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    // Three columns rather than justify-between: the right group carries the
    // Add button on desktop, so a flex row would push the heading off centre.
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Link
        href={`${basePath}?d=${prev}`}
        aria-label="Previous day"
        className="justify-self-start rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      <div className="flex min-w-0 flex-col items-center">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight">
          {isToday ? "Today" : label}
        </h1>
        <span className="tnum text-[0.8125rem] text-ink-3">{isToday ? label : date}</span>
      </div>

      <div className="flex items-center justify-end gap-2 justify-self-end">
        {isToday ? (
          <span className="p-2 opacity-0" aria-hidden="true">
            <ChevronRight className="h-5 w-5" />
          </span>
        ) : (
          <Link
            href={`${basePath}?d=${next}`}
            aria-label="Next day"
            className="rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        )}
        <AddEntryButton />
      </div>
    </div>
  );
}
