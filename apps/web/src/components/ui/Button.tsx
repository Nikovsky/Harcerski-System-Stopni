// @file: apps/web/src/components/ui/Button.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";
import type { UITheme } from "@hss/schemas";

type Props = ComponentPropsWithoutRef<"button"> & {
  theme?: UITheme;
};

export function Button({ theme = "main", className = "", ...rest }: Props) {
  return <button {...rest} className={`ui-theme ui-theme-${theme} ${className}`.trim()} />;
}