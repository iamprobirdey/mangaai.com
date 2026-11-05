import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      // Preview deployments must never be indexed.
      ...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
    ];
    return [
      { source: "/:path*", headers: security },
      {
        // The reader never caches signed page URLs in shared caches.
        source: "/read/volume/:id*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
