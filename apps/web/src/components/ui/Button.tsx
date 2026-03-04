// @file: apps/web/src/components/ui/Button.tsx
"use client";

import type { ButtonProps, ButtonTone } from "@/components/props/ui";

const BASE =
  [
    // layout
    "inline-flex items-center justify-center gap-2",
    "h-8 px-2 rounded-md",
    "text-sm font-semibold whitespace-nowrap select-none",

    // border + shadow
    "border",
    "shadow-sm",

    // fast interaction (not a long transition)
    "transition-[transform,box-shadow,filter] duration-75",

    // hover/active: works for ANY bg color via brightness filter
    "hover:brightness-95",
    "active:brightness-90",
    "active:translate-y-[1px]",
    "active:shadow-inner",

    // a11y
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" ");

const TONES: Record<ButtonTone, string> = {
  // neutral / “main”
  main: "bg-card text-card-foreground border-border",
  // accent / primary
  accent: "bg-accent text-accent-foreground border-border",
};

export function Button({
  tone = "main",
  colorClass = "",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={[BASE, TONES[tone], className, colorClass].filter(Boolean).join(" ")}
    />
  );
}
