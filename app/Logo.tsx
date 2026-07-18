// Quadrant mark: four tracked domains (food, water, exercise, time) as
// dashboard tiles. Keep in sync with app/icon.svg and app/apple-icon.tsx.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true">
      <rect width="128" height="128" rx="28" fill="#18181b" />
      <rect x="28" y="28" width="32" height="32" rx="10" fill="#34d399" />
      <rect x="68" y="28" width="32" height="32" rx="10" fill="#38bdf8" />
      <rect x="28" y="68" width="32" height="32" rx="10" fill="#fbbf24" />
      <rect x="68" y="68" width="32" height="32" rx="10" fill="#fb7185" />
    </svg>
  );
}
