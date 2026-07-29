import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pemantik/ui", "@pemantik/supabase"],
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb", // buat server actions (kalau ada yg upload lewat server action)
    },
    proxyClientMaxBodySize: "200mb", // <-- INI YANG BENAR, ganti dari middlewareClientMaxBodySize
  },
};

export default nextConfig;