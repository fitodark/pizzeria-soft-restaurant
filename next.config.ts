import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaquetado para producción: node .next/standalone/server.js (Step 15)
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: "default-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
