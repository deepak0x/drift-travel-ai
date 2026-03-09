import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",       // Static HTML export for Azure Static Web Apps
  trailingSlash: true,    // Needed for SWA routing
  images: {
    unoptimized: true,    // Required for static export (no image optimization server)
  },
};

export default nextConfig;
