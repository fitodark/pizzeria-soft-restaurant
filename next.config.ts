import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaquetado para producción: node .next/standalone/server.js (Step 15)
  output: "standalone",
  // La Content-Security-Policy se genera por request (con nonce) en
  // src/proxy.ts — ahí necesita variar en cada respuesta; aquí solo van los
  // headers estáticos que no dependen del nonce.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
