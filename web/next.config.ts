import type { NextConfig } from "next";

// On GitHub Pages the site lives under /<repo-name>, so the build sets
// NEXT_PUBLIC_BASE_PATH. Locally (and on Vercel) it stays empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static export: plain HTML/CSS/JS that any static host can serve.
  // All data access happens in the browser against Supabase.
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
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
