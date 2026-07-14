// Hero card: today's calories against the target, with a progress bar and
// an explicit over-target state.
export default function CaloriesCard({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const kcal = Math.round(consumed);
  const over = Math.max(0, kcal - target);
  const left = Math.max(0, target - kcal);
  const pct = target > 0 ? Math.min(100, (kcal / target) * 100) : 0;

  return (
    <section className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm dark:border-emerald-950/50 dark:from-emerald-950/30 dark:via-zinc-900 dark:to-zinc-900">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Calories today
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-4xl font-semibold tabular-nums sm:text-5xl">
          {kcal}
          <span className="text-lg font-normal text-zinc-500"> / {target} kcal</span>
        </div>
        <div
          className={`text-sm tabular-nums ${
            over ? "font-medium text-rose-600 dark:text-rose-400" : "text-zinc-500"
          }`}
        >
          {over ? `${over} over` : `${left} left`}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
