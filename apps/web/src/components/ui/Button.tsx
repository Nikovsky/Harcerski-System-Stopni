// @file: apps/web/src/components/ui/Button.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";

type Tone = "main" | "accent";

type Props = ComponentPropsWithoutRef<"button"> & {
  tone?: Tone;
  /**
   * Optional Tailwind color override, e.g.:
   * "bg-emerald-600 text-white border-emerald-700"
   * (You can also pass hover:/active: classes if you want.)
   */
  colorClass?: string;
};

const BASE =
  [
    // layout
    "inline-flex items-center justify-center gap-2",
    "h-10 px-4 rounded-md",
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

const TONES: Record<Tone, string> = {
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
}: Props) {
  return (
    <button
      {...rest}
      type={type}
      className={[BASE, TONES[tone], className, colorClass].filter(Boolean).join(" ")}
    />
  );
}