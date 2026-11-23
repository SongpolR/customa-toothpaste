import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic request-time rendering: Customa is mostly client UI + API routes.
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
