import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /portal URL prefix was dropped (app/(portal) is now a route group,
  // not a path segment) — these keep old /portal/... bookmarks working.
  async redirects() {
    return [
      { source: "/portal", destination: "/dashboard", permanent: true },
      { source: "/portal/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
