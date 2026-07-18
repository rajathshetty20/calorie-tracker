import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon — quadrant mark from app/icon.svg, full-bleed since iOS
// applies its own corner mask. Tiles scaled 180/128 from the SVG.
export default function AppleIcon() {
  const tile = (color: string) => ({
    width: 45,
    height: 45,
    borderRadius: 14,
    background: color,
  });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 11,
          background: "#18181b",
        }}
      >
        <div style={{ display: "flex", gap: 11 }}>
          <div style={tile("#34d399")} />
          <div style={tile("#38bdf8")} />
        </div>
        <div style={{ display: "flex", gap: 11 }}>
          <div style={tile("#fbbf24")} />
          <div style={tile("#fb7185")} />
        </div>
      </div>
    ),
    { ...size },
  );
}
