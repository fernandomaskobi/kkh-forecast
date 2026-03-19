import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/merch-review", permanent: false },
    ];
  },
};

export default nextConfig;
