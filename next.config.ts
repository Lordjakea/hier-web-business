import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.hierapp.co.uk",
      },
    ],
  },
};

export default nextConfig;