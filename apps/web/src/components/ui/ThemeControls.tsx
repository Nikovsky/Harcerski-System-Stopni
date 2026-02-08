// @file: apps/web/src/components/ui/ThemeControls.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MoonStars, Sun } from "react-bootstrap-icons";

type AppTheme = "dark" | "light";

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

  const cookieTheme = getCookie("ui_theme") as AppTheme | null;
  if (cookieTheme === "light" || cookieTheme === "dark") return cookieTheme;

  const dataTheme = root.dataset.theme as AppTheme | undefined;
  if (dataTheme === "light" || dataTheme === "dark") return dataTheme;

  // optional fallback: system preference (only if nothing else is set)
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeControls() {
  // keep default consistent with SSR fallback (layout.tsx -> "light" when missing cookie)
  const [theme, setTheme] = useState<AppTheme>("light");

  const label = useMemo(() => (theme === "dark" ? "Dark" : "Light"), [theme]);

  useEffect(() => {
    const initial = resolveInitialTheme();
    document.documentElement.dataset.theme = initial;
    setCookie("ui_theme", initial);
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setCookie("ui_theme", next);
    setTheme(next);
  }

  // show "what you switch to"
  const ThemeIcon = theme === "dark" ? Sun : MoonStars;
  const nextLabel = theme === "dark" ? "Light" : "Dark";

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-foreground/70 md:inline">{label}</span>

      <Button
        onClick={toggleTheme}
        className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm"
        type="button"
        aria-label={`Switch to ${nextLabel} theme`}
        title={`Switch to ${nextLabel} theme`}
      >
        <ThemeIcon size={16} />
        Theme
      </Button>
    </div>
  );
}