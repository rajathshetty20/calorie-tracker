// At-a-glance stat tile. Owns the value/sub typography so interactive tiles
// (e.g. WaterTracker) render TileBody instead of copying the markup.
export function TileBody({
  value,
  sub,
  actions,
}: {
  value: string;
  sub?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-lg font-semibold tabular-nums">{value}</div>
        {sub && <div className="truncate text-xs text-zinc-500 tabular-nums">{sub}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export default function Tile({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value?: string | null;
  sub?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      {children ?? <TileBody value={value ?? "—"} sub={sub ?? "not logged"} />}
    </div>
  );
}
