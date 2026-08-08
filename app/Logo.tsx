import { MARK } from "./logoMark";

// Perimeter mark — geometry lives in logoMark.ts; see the sync note there.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true">
      <rect width="128" height="128" rx="28" fill={MARK.ground} />
      <path
        d={MARK.trackPath}
        fill="none"
        stroke={MARK.track}
        strokeWidth={MARK.strokeWidth}
      />
      <path
        d={MARK.arcPath}
        fill="none"
        stroke={MARK.accent}
        strokeWidth={MARK.strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
