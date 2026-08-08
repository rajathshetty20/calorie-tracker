// The three shapes the whole app is built from.
//
// Previously `rounded-xl border … shadow-sm` appeared in eleven files and gave
// every section identical visual weight, which is why nothing on the page had
// hierarchy. Sections are now hairline-separated groups; only the two things
// that genuinely float — the quick-add sheet and the timer bar — get elevation.

export type Domain = "food" | "water" | "weight" | "exercise" | "time";

export const DOMAIN_COLOR: Record<Domain, string> = {
  food: "var(--food)",
  water: "var(--water)",
  weight: "var(--weight)",
  exercise: "var(--exercise)",
  time: "var(--time)",
};

/** A titled block of content. No border, no shadow — a rule and a label. */
export function Group({
  title,
  meta,
  domain,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  domain?: Domain;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[0.8125rem] font-semibold tracking-wide text-ink-2 uppercase">
          {domain && (
            <span aria-hidden="true"
 className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: DOMAIN_COLOR[domain] }} />
          )}
          {title}
        </h2>
        {meta && <span className="tnum text-[0.8125rem] text-ink-3">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

/** Hairline-divided list. */
export function Rows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-rule-soft">{children}</ul>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-[0.8125rem] text-ink-3">{children}</p>;
}

/** Primary action. The accent is reserved for these and for live state. */
export function Button({
  children,
  variant = "primary",
 className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "accent";
}) {
  const styles = {
    primary:
      "bg-ink text-ground hover:opacity-90 disabled:opacity-40",
    accent:
      "bg-accent text-ground hover:opacity-90 disabled:opacity-40 dark:text-[#08251c]",
    quiet:
      "border border-rule text-ink-2 hover:bg-surface-2 disabled:opacity-40",
  }[variant];
  return (
    <button
      {...props}
 className={`rounded-lg px-3.5 py-2 text-[0.8125rem] font-semibold transition-opacity ${styles} ${className}`} >
      {children}
    </button>
  );
}

export const inputClass =
  "w-full rounded-lg border border-rule bg-surface px-3 py-2 text-body outline-none placeholder:text-ink-3 focus:border-ink";
