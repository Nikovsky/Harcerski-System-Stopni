// @file: apps/web/src/components/ui/ThemeControls.tsx
"use client";

import { useTranslations } from "next-intl";
import type { ThemeControlsProps } from "@/components/props/ui";
import { Button } from "@/components/ui/Button";
import { MoonStars, Sun } from "react-bootstrap-icons";

type AppTheme = "dark" | "light";

const THEME_COOKIE_NAME = "ui_theme";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCookie(name: string): string | null {
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`)
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie =
    `${name}=${encodeURIComponent(value)}; ` +
    `Max-Age=31536000; Path=/; SameSite=Lax` +
    (secure ? "; Secure" : "");
}

function resolveInitialTheme(): AppTheme {
  const root = document.documentElement;

  const cookieTheme = getCookie(THEME_COOKIE_NAME) as AppTheme | null;
  if (cookieTheme === "light" || cookieTheme === "dark") return cookieTheme;

  const dataTheme = root.dataset.theme as AppTheme | undefined;
  if (dataTheme === "light" || dataTheme === "dark") return dataTheme;

  // optional fallback: system preference (only if nothing else is set)
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  setCookie(THEME_COOKIE_NAME, theme);
}

function resolveCurrentTheme(): AppTheme {
  const dataTheme = document.documentElement.dataset.theme;
  if (dataTheme === "light" || dataTheme === "dark") return dataTheme;
  return resolveInitialTheme();
}

export function ThemeControls({ variant = "default" }: ThemeControlsProps) {
  const t = useTranslations("common.theme");

  function toggleTheme() {
    const current = resolveCurrentTheme();
    const next: AppTheme = current === "dark" ? "light" : "dark";
    applyTheme(next);
  }

  if (variant === "icon") {
    return (
      <Button
        onClick={toggleTheme}
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-border p-0 text-sm"
        type="button"
        aria-label={t("toggle")}
        title={t("toggle")}
      >
        <MoonStars size={16} className="theme-toggle__moon shrink-0" />
        <Sun size={16} className="theme-toggle__sun shrink-0" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={toggleTheme}
        className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm"
        type="button"
        aria-label={t("toggle")}
        title={t("toggle")}
      >
        <MoonStars size={16} className="theme-toggle__moon shrink-0" />
        <Sun size={16} className="theme-toggle__sun shrink-0" />
        <span className="theme-toggle__label-dark">{t("dark")}</span>
        <span className="theme-toggle__label-light">{t("light")}</span>
      </Button>
    </div>
  );
}
