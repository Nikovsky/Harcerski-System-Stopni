// @file: apps/web/src/components/ui/ThemeControls.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MoonStars, Sun, CircleHalf } from "react-bootstrap-icons";

type AppTheme = "dark" | "light";
type Contrast = "normal" | "high";

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function ThemeControls() {
  const [theme, setTheme] = useState<AppTheme>("dark");
  const [contrast, setContrast] = useState<Contrast>("normal");

  const label = useMemo(() => {
    const t = theme === "dark" ? "Dark" : "Light";
    const c = contrast === "high" ? "HC: On" : "HC: Off";
    return `${t} • ${c}`;
  }, [theme, contrast]);

  useEffect(() => {
    const root = document.documentElement;

    const cookieTheme =
      (getCookie("ui_theme") as AppTheme | null) ??
      (root.dataset.theme as AppTheme | undefined) ??
      "dark";

    const cookieContrast =
      (getCookie("ui_contrast") as Contrast | null) ??
      (root.dataset.contrast as Contrast | undefined) ??
      "normal";

    root.dataset.theme = cookieTheme;
    root.dataset.contrast = cookieContrast;

    setTheme(cookieTheme);
    setContrast(cookieContrast);
  }, []);

  function toggleTheme() {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setCookie("ui_theme", next);
    setTheme(next);
  }

  function toggleContrast() {
    const next: Contrast = contrast === "high" ? "normal" : "high";
    document.documentElement.dataset.contrast = next;
    setCookie("ui_contrast", next);
    setContrast(next);
  }

  // show "what you switch to"
  const ThemeIcon = theme === "dark" ? Sun : MoonStars;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-foreground/70 md:inline">{label}</span>

      <Button
        theme="secondary"
        onClick={toggleTheme}
        className="rounded border border-border px-3 py-1.5 text-sm inline-flex items-center gap-2"
        type="button"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <ThemeIcon size={16} />
        Theme
      </Button>

      <Button
        theme="warning"
        onClick={toggleContrast}
        className="rounded border border-border px-3 py-1.5 text-sm inline-flex items-center gap-2"
        type="button"
        aria-label="Toggle high contrast"
        title="Toggle high contrast"
      >
        <CircleHalf size={16} />
        Contrast
      </Button>
    </div>
  );
}
