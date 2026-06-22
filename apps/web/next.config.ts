// @file: apps/web/next.config.ts
import path from "path";
import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";
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

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.BUNDLE_ANALYZE === "true",
  openAnalyzer: false,
});

const withNextIntl = createNextIntlPlugin();
export default withBundleAnalyzer(withNextIntl(nextConfig));
