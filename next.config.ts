import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a lockfile in a parent folder isn't picked up instead.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    // Invoice photos are sent as base64 to the server actions / routes.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
