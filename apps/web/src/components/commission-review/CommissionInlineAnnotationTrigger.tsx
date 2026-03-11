// @file: apps/web/src/components/commission-review/CommissionInlineAnnotationTrigger.tsx
"use client";

import { ChatLeftText, JournalText } from "react-bootstrap-icons";

type Props = {
  label: string;
  onClick: () => void;
  count?: number;
  disabled?: boolean;
  tone?: "internal" | "candidate";
};

export function CommissionInlineAnnotationTrigger({
  label,
  onClick,
  count,
  disabled = false,
  tone = "candidate",
}: Props) {
  const Icon = tone === "internal" ? JournalText : ChatLeftText;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`relative inline-flex size-9 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "internal"
          ? "border-border bg-background text-foreground/65 hover:border-primary/40 hover:text-foreground"
          : "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-400 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200"
      }`}
    >
      <Icon size={15} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={`absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            tone === "internal"
              ? "bg-muted text-foreground/60"
              : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
