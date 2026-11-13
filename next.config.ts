import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-only Next.js badge sits on top of the bottom tab bar, so it is turned off.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
