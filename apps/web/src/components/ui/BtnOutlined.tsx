// @file: apps/web/src/components/ui/BtnOutlined.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";
import type { UITheme } from "@hss/schemas";

type Props = ComponentPropsWithoutRef<"button"> & {
  theme?: UITheme;
};

const BASE = [
  "ui-theme",
  "ui-outline",
  "box-border",
  "inline-flex items-center justify-center gap-2",
  "px-10 py-2",
  "rounded-md",
  "text-sm font-semibold",
  "transition",
  "select-none",
  "disabled:opacity-50 disabled:pointer-events-none",

  /* stable size (border reserved) */
  "border-[length:var(--ui-border-width)]",

  /* outline visuals */
  "bg-transparent",
  "border-[hsl(var(--ui-outline-bd))]",
  "text-[hsl(var(--ui-outline-fg))]",
  "hover:bg-[hsl(var(--ui-outline-hover-bg))]",
  "active:bg-[hsl(var(--ui-outline-active-bg))]",

  /* focus ring */
  "focus-visible:outline-none",
  "focus-visible:ring-[length:var(--ui-ring-width)]",
  "focus-visible:ring-[hsl(var(--ui-ring))]",
  "focus-visible:ring-offset-[length:var(--ui-ring-offset)]",
  "focus-visible:ring-offset-background",

  /* pressed feel */
  "active:translate-y-px",
].join(" ");

export function BtnOutlined({ theme = "main", className = "", type = "button", ...rest }: Props) {
  return (
    <button
      {...rest}
      type={type}
      className={`${BASE} ui-theme-${theme} ${className}`.trim()}
    />
  );
}