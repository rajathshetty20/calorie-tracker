"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import MealForm from "./meals/MealForm";
import ExerciseForm from "./exercises/ExerciseForm";
import TimeForm from "./time/TimeForm";
import TimerControls from "./time/TimerControls";
import WeightForm from "./WeightForm";
import WaterTracker from "./WaterTracker";
import { loadQuickAddData, type QuickAddData } from "./quickAddData";
import { DOMAIN_COLOR, type Domain } from "./ui";
import TabStrip from "./TabStrip";

const TABS: { key: Domain; label: string }[] = [
  { key: "food", label: "Meal" },
  { key: "water", label: "Water" },
  { key: "exercise", label: "Exercise" },
  { key: "weight", label: "Weight" },
  { key: "time", label: "Time" },
];

/**
 * One sheet that logs anything, from anywhere.
 *
 * Replaces five `<details>` disclosures scattered down the Today page: logging
 * used to cost open → scroll to the right section → expand → fill → submit.
 * Now it's one tap from any screen.
 */
export default function QuickAdd({
  open,
  viewing,
  onClose,
}: {
  open: boolean;
  /** Day from ?d=, captured when the sheet opened; null means today. */
  viewing: string | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Domain>("food");
  const [data, setData] = useState<QuickAddData | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetched on first open, not on mount: the sheet lives in the layout and
  // most page views never touch it.
  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    loadQuickAddData().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Browsing a past day and hitting + used to file the entry against today.
  const target = data ? (viewing && viewing < data.today ? viewing : data.today) : null;
  const backdating = !!target && !!data && target !== data.today;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="Close"
        onClick={onClose}
 className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        ref={panelRef} role="dialog" aria-modal="true" aria-label="Add an entry"
 className="relative mx-auto max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mb-6 sm:rounded-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.18)] motion-safe:animate-[sheet-in_150ms_ease-out]" >
        <style>{`@keyframes sheet-in{from{transform:translateY(12px);opacity:.6}to{transform:none;opacity:1}}`}</style>

        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-rule bg-surface px-4 pb-2 pt-3">
          <TabStrip activeKey={tab}>
            {TABS.map((t) => (
              <button
                key={t.key} type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
 className={`min-h-[40px] shrink-0 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
                  tab === t.key ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink-2"
                }`} >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true"
 className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: tab === t.key ? DOMAIN_COLOR[t.key] : "transparent",
                    }} />
                  {t.label}
                </span>
              </button>
            ))}
          </TabStrip>
          <button type="button"
            onClick={onClose} aria-label="Close"
 className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" >
            <X className="h-4 w-4" />
          </button>
        </div>

        {backdating && data && (
          <p className="border-b border-rule bg-surface-2 px-4 py-2 text-[0.75rem] text-ink-2">
            Logging to{" "}
            <span className="font-semibold">
              {new Date(`${target}T12:00:00`).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            , the day you&apos;re viewing — not today.
          </p>
        )}

        <div className="px-4 py-4">
          {!data ? (
            <p className="py-6 text-center text-[0.8125rem] text-ink-3">Loading…</p>
          ) : (
            <>
              {tab === "food" && <MealForm presets={data.mealPresets} today={target!} />}
              {tab === "water" && (
                <div className="rounded-lg border border-rule p-3">
                  <WaterTracker
                    key={target!}
                    date={target!}
                    initialMl={data.waterMl}
                    bottleMl={data.bottleMl} />
                </div>
              )}
              {tab === "exercise" && (
                <ExerciseForm presets={data.exercisePresets} today={target!} />
              )}
              {tab === "weight" && (
                <WeightForm
                  today={target!}
                  todaysWeight={data.todaysWeight}
                  lastWeight={data.lastWeight} />
              )}
              {tab === "time" && (
                <div className="space-y-4">
                  <TimerControls categories={data.timeCategories} running={null} />
                  <div className="border-t border-rule pt-3">
                    <p className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-2">
                      Or log a past interval
                    </p>
                    <TimeForm timeZone={data.timeZone} categories={data.timeCategories} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
