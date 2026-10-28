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
  // Profile pictures are uploaded to Vercel Blob (app/api/profile/picture)
  // and stored at whatever resolution the user uploaded — letting
  // next/image optimize them (proper downsampling instead of a raw <img>
  // the browser scales naively) is what actually fixes blurry avatars at
  // display sizes bigger than ~80px, not a CSS tweak.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
