"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import DeleteButton from "./DeleteButton";

/**
 * A log row you can read, edit and delete.
 *
 * Titles across the log used to be set at different sizes depending on which
 * component drew them, and long names were truncated with no way to see the
 * rest — on a phone that meant a meal you couldn't identify. Titles now wrap,
 * and every row exposes the same explicit edit and delete controls rather
 * than hiding editing behind a tap on the row itself.
 */
export default function EditableRow({
  table,
  id,
  label,
  title,
  detail,
  value,
  editor,
}: {
  table: "meals" | "exercises" | "time_entries";
  id: string;
  label: string;
  title: string;
  detail?: React.ReactNode;
  value: React.ReactNode;
  editor?: (close: () => void) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  function toggle() {
    const next = !editing;
    setEditing(next);
    if (next) {
      // The panel opens below the fold on a phone; without this the tap
      // reads as having done nothing.
      requestAnimationFrame(() =>
        panel.current?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
    }
  }

  return (
    <div className="py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[0.9375rem] leading-snug">{title}</div>
          {detail && <div className="tnum text-[0.8125rem] text-ink-3">{detail}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="tnum mr-1 text-right text-[0.8125rem] text-ink-2">{value}</span>
          {editor && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={editing}
              aria-label={`Edit ${label}`}
              className="-my-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <DeleteButton table={table} id={id} label={label} />
        </div>
      </div>
      {editing && editor && (
        // Reclaim the timeline's time gutter (w-11 + gap-3 = 3.5rem). Left
        // inside the content column the panel had ~250px on a phone, which
        // squeezed every field and pushed controls against the edge.
        <div ref={panel} className="-ml-14 mt-2 rounded-lg border border-rule bg-surface p-2.5">
          {editor(() => setEditing(false))}
        </div>
      )}
    </div>
  );
}
