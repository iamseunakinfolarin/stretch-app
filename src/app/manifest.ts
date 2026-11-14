import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest.
// The name and id are placeholders until they are locked in Phase 6.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Stretch",
    short_name: "Stretch",
    description: "Pray deliberately. Keep the hours.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#f5efff",
    background_color: "#f5efff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
