import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // Sharp 0.35 ships native DLLs/shared libraries beside its Node addon.
  outputFileTracingIncludes: { "/*": ["./node_modules/@img/sharp-*/lib/**/*"] },
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        },
      ],
    }, {
      source: "/api/uploads/:path*",
      has: [{ type: "query", key: "preview", value: "1" }],
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'" },
      ],
    }];
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
