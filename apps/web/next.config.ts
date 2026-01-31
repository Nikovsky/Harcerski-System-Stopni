// apps/web/next.config.ts
import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {},
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  allowedDevOrigins: [
    "hss.local"
  ],
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);