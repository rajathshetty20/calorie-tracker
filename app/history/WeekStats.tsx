// Small "7-day avg / std dev" pair shown in each history chart header.
// Values arrive pre-formatted so this stays presentation-only.
export default function WeekStats({ avg, std }: { avg: string; std: string }) {
  return (
    <div className="flex gap-4 text-[0.75rem]">
      <div>
        <div className="text-ink-3">7-day avg</div>
        <div className="font-medium text-ink tabular-nums">{avg}</div>
      </div>
      <div>
        <div className="text-ink-3">Day-to-day swing</div>
        <div className="font-medium text-ink tabular-nums">{std}</div>
      </div>
    </div>
  );
}
