import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.ufs.sh" }],
  },
};

export default nextConfig;
