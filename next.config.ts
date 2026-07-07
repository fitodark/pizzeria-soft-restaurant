import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaquetado para producción: node .next/standalone/server.js (Step 15)
  output: "standalone",
};

export default nextConfig;
