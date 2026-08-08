"use client";

import { Plus } from "lucide-react";
import { useAddSheet } from "./AddSheet";

/**
 * The desktop entry point for logging.
 *
 * It sits beside the date strip rather than in the top bar for two reasons:
 * the action belongs next to the content it writes to, not 500px away in the
 * account corner; and being adjacent to the date makes backdating legible —
 * you can see which day you are adding to.
 *
 * Hidden below md, where the bottom bar's centre control does this job.
 */
export default function AddEntryButton() {
  const { open } = useAddSheet();
  return (
    <button
      type="button"
      onClick={open}
      className="hidden items-center gap-1.5 rounded-lg border border-rule px-3 py-1.5 text-[0.8125rem] font-semibold text-ink hover:bg-surface-2 md:inline-flex"
    >
      <Plus className="h-4 w-4" />
      Add entry
    </button>
  );
}
