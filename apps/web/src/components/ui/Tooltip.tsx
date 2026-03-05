// @file: apps/web/src/components/ui/Tooltip.tsx
"use client";

import { InfoCircle } from "react-bootstrap-icons";
import type { TooltipProps } from "@/components/props/ui";

export function Tooltip({ text }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <InfoCircle size={12} />
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-52 -translate-x-1/2 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
