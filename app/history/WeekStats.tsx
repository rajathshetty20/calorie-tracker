// Small "7-day avg / std dev" pair shown in each history chart header.
// Values arrive pre-formatted so this stays presentation-only.
export default function WeekStats({ avg, std }: { avg: string; std: string }) {
  return (
    <div className="flex gap-4 text-xs">
      <div>
        <div className="text-zinc-500">7-day avg</div>
        <div className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{avg}</div>
      </div>
      <div>
        <div className="text-zinc-500">Std dev</div>
        <div className="font-medium text-zinc-900 tabular-nums dark:text-zinc-100">{std}</div>
      </div>
    </div>
  );
}
