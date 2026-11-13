import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // {
      //   source: "/api/py/:path*",
      //   destination:
      //     process.env.NODE_ENV === "development"
      //       ? "http://127.0.0.1:8000/api/py/:path*"
      //       : "/api/",
      // },
      {
        source: "/api/py/:path*",
        destination: "http://127.0.0.1:8000/api/py/:path*",
      },
      {
        source: "/openapi.json",
        destination: "http://127.0.0.1:8000/openapi.json",
      },
    ];
  },
};

export default nextConfig;