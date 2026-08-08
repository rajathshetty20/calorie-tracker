import { Droplet, Drumstick, Wheat } from "lucide-react";

// Calories against target, with the macro split directly underneath — one
// block rather than two competing cards.
export default function Hero({
  consumed,
  target,
  macros,
}: {
  consumed: number;
  target: number;
  macros: { label: string; value: number; target: number; color: string }[];
}) {
  const kcal = Math.round(consumed);
  const over = Math.max(0, kcal - target);
  const left = Math.max(0, target - kcal);
  const pct = target > 0 ? Math.min(100, (kcal / target) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="tnum text-[2.5rem] font-semibold leading-none">
          {kcal.toLocaleString()}
          <span className="text-[1rem] font-normal text-ink-3"> / {target.toLocaleString()} kcal</span>
        </div>
        <div
 className={`tnum text-[0.8125rem] font-semibold ${over ? "text-over" : "text-ink-3"}`} >
          {over ? `${over} over` : `${left} left`}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
 className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: over ? "var(--over)" : "var(--accent)" }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <Macro key={m.label} {...m} />
        ))}
      </div>
    </div>
  );
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Carbs: Wheat,
  Protein: Drumstick,
  Fat: Droplet,
};

function Macro({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const Icon = ICONS[label];
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = target > 0 && value > target;
  // Label and value stack: at 375px a column is ~96px, which cannot fit an
  // icon, a word and "150 / 150g" side by side.
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="tnum mt-0.5 text-[0.8125rem] font-semibold">
        {Math.round(value)}
        <span className="font-normal text-ink-3"> / {target}g</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
        <div
 className="h-full"
          style={{ width: `${pct}%`, backgroundColor: over ? "var(--over)" : color }} />
      </div>
    </div>
  );
}
