import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  transpilePackages: ["@toksai/api"],
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  async headers() {
    return [
      {
        source: "/a/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};
export default config;
