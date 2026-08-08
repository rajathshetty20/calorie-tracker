// The "Perimeter" mark: a day as a closed circuit, drawn on a square path.
// The grey track is the whole day; the accent arc is the part that's elapsed,
// which is also why the same geometry drives the running-timer dial.
//
// This module is the single source of the geometry. Three surfaces render it:
//   app/Logo.tsx      — in-app JSX, from the constants below
//   app/apple-icon.tsx & app/icon-*.png — rasterised via markSvg()
//   app/icon.svg      — static file, must be updated by hand to match
export const MARK = {
  ground: "#18181b",
  track: "#3f3f46",
  accent: "#34d399",
  strokeWidth: 12,
  // Full rounded-square ring, clockwise from the top edge.
  trackPath:
    "M48 26 H80 A22 22 0 0 1 102 48 V80 A22 22 0 0 1 80 102 H48 A22 22 0 0 1 26 80 V48 A22 22 0 0 1 48 26 Z",
  // Same path, started at top-centre and stopped a little past three quarters.
  arcPath: "M64 26 H80 A22 22 0 0 1 102 48 V80 A22 22 0 0 1 80 102 H56",
} as const;

// Standalone SVG markup, for surfaces that need a string rather than JSX
// (ImageResponse, data URIs). `ground` off gives a transparent mark.
export function markSvg({ ground = true }: { ground?: boolean } = {}) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
    ground ? `<rect width="128" height="128" rx="28" fill="${MARK.ground}"/>` : "",
    `<path d="${MARK.trackPath}" fill="none" stroke="${MARK.track}" stroke-width="${MARK.strokeWidth}"/>`,
    `<path d="${MARK.arcPath}" fill="none" stroke="${MARK.accent}" stroke-width="${MARK.strokeWidth}" stroke-linecap="round"/>`,
    "</svg>",
  ].join("");
}

export function markDataUri(opts?: { ground?: boolean }) {
  return `data:image/svg+xml;base64,${Buffer.from(markSvg(opts)).toString("base64")}`;
}
