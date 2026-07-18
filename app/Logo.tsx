// Inline app mark — keep in sync with app/icon.svg and app/apple-icon.tsx.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="url(#logo-g)" />
      <rect x="34" y="68" width="14" height="28" rx="7" fill="#fff" />
      <rect x="57" y="50" width="14" height="46" rx="7" fill="#fff" />
      <rect x="80" y="32" width="14" height="64" rx="7" fill="#fff" />
    </svg>
  );
}
