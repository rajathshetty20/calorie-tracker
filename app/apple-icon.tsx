import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon — same mark as app/icon.svg, full-bleed since iOS
// applies its own corner mask. Bars scaled 180/128 from the SVG.
export default function AppleIcon() {
  const bar = (height: number) => ({
    width: 20,
    height,
    borderRadius: 10,
    background: "#fff",
  });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 12,
          paddingBottom: 45,
          background: "linear-gradient(180deg, #34d399 0%, #059669 100%)",
        }}
      >
        <div style={bar(39)} />
        <div style={bar(65)} />
        <div style={bar(90)} />
      </div>
    ),
    { ...size },
  );
}
