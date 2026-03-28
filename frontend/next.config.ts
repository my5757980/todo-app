import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from the backend in development
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
