import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  transpilePackages: ["@pemantik/ui", "@pemantik/supabase"],
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    proxyClientMaxBodySize: "200mb",
  },
};

export default withSerwist(nextConfig);