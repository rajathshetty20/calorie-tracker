import { ImageResponse } from "next/og";
import { markDataUri } from "./logoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon. Rasterises the shared mark full-bleed — iOS applies its
// own corner mask, and the mark already carries the rounded ground.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <img
        src={markDataUri()}
        width={size.width}
        height={size.height} alt=""
        style={{ width: "100%", height: "100%" }} />
    ),
    { ...size },
  );
}
