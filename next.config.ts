import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/customer',
        destination: '/customers',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
