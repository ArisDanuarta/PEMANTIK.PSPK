import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pemantik/ui", "@pemantik/supabase"],
};

export default nextConfig;
