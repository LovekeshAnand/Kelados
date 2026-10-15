import type { NextConfig } from "next";

// Fully static export: every page is client-side, so it deploys to Cloudflare Pages for free.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Build workers default to one per core; cap them on low-memory machines with NEXT_BUILD_CPUS=2.
  experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) || undefined },
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
