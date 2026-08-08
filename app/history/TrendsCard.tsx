import { DOMAIN_COLOR, type Domain } from "../ui";

export type Trend = {
  domain: Domain;
  label: string;
  value: string;
  /** Change against the previous 7 days; null when there isn't enough data. */
  delta: number | null;
  deltaLabel?: string;
  /** Whether a rise is a good thing, for colouring. Weight is neither. */
  direction: "up-good" | "down-good" | "neutral";
};

// Period-over-period is the question a history page should answer first —
// "is this week different from last week?" — before any chart is read.
export default function TrendsCard({
  trends,
  loggedDays,
  totalDays,
}: {
  trends: Trend[];
  /** Days in the window with any meals logged. */
  loggedDays: number;
  totalDays: number;
}) {
  return (
    <section className="border-t border-rule pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-ink-2">
          Last 7 days
        </h2>
        <span className="text-[0.8125rem] text-ink-3">vs prev 7 days</span>
      </div>
      {/* These are averages over days that have data. With only some days
          logged the headline flatters you and matches nothing, so say how
          many days it actually covers. */}
      {loggedDays < totalDays && (
        <p className="mb-2 text-[0.75rem] text-ink-3">
          Averaged over the {loggedDays} of {totalDays} days with entries.
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {trends.map((t) => (
          <div key={t.label} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: DOMAIN_COLOR[t.domain] }}
              />
              <span className="truncate text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-3">
                {t.label}
              </span>
            </div>
            <div className="tnum mt-1 text-[1.125rem] font-semibold leading-tight">{t.value}</div>
            <div className={`tnum truncate text-[0.75rem] ${toneOf(t)}`}>
              {t.delta === null ? "no comparison yet" : t.deltaLabel}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function toneOf(t: Trend) {
  if (t.delta === null || t.delta === 0 || t.direction === "neutral") return "text-ink-3";
  const good = t.direction === "up-good" ? t.delta > 0 : t.delta < 0;
  return good ? "text-accent-ink" : "text-over";
}
