// @file: apps/web/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
      },
      borderRadius: {
        ui: "var(--radius-ui)",
        btn: "var(--radius-btn)",
      },
    },
  },
  plugins: [],
} satisfies Config;
