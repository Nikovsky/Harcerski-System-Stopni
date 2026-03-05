// @file: apps/web/src/components/ui/Throbber.tsx
import type { CSSProperties } from "react";
import type { ThrobberProps } from "@/components/props/ui";

type ThrobberCssVars = CSSProperties & {
  "--throbber-factor"?: number;
};

export function Throbber({
  inline = false,
  factor = 1,
  className = "",
  ariaLabel = "Loading",
}: ThrobberProps) {
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const style: ThrobberCssVars = { "--throbber-factor": safeFactor };

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={["throbber", inline ? "throbber--inline" : "throbber--fill", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span className="throbber__ring" aria-hidden="true" />
    </span>
  );
}
