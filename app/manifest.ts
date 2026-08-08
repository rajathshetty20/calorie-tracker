import type { MetadataRoute } from "next";

// Without this, "Add to Home Screen" produces a bookmark that opens Safari
// with its address bar and toolbar. display: standalone is what turns the
// same tap into an app window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Tracker",
    short_name: "Tracker",
    description: "Meals, water, weight, exercise, and time — one daily dashboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#ffffff",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      // The mark sits inside the inner 80% of its canvas, so the same art is
      // safe under Android's maskable crop.
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
