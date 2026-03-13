// @file: apps/web/src/components/commission-review/CommissionAnchorTriggerMarkup.tsx

import { useTranslations } from "next-intl";
import type { InstructorReviewAnchorType } from "@hss/schemas";

type Props = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
  allowCandidateFeedback?: boolean;
  canMutateCandidateFeedback: boolean;
  canMutateInternalNotes: boolean;
  candidateCount?: number;
  internalCount?: number;
  hasCandidateDraft?: boolean;
};

function triggerClassName(tone: "internal" | "candidate"): string {
  return `relative inline-flex size-9 items-center justify-center rounded-full border transition ${
    tone === "internal"
      ? "border-border bg-background text-foreground/65 hover:border-primary/40 hover:text-foreground"
      : "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-400 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200"
  }`;
}

function badgeClassName(tone: "internal" | "candidate"): string {
  return `absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
    tone === "internal"
      ? "bg-muted text-foreground/60"
      : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100"
  }`;
}

function TriggerIcon({ tone }: { tone: "internal" | "candidate" }) {
  if (tone === "internal") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-[15px]"
        fill="currentColor"
      >
        <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h6.086a1.5 1.5 0 0 0 1.06-.44l1.914-1.914a1.5 1.5 0 0 0 .44-1.06V3.5A1.5 1.5 0 0 0 11.5 2h-8Zm1 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 4.5 5Zm0 2.75A.75.75 0 0 1 5.25 7h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm.75 2a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-[15px]"
      fill="currentColor"
    >
      <path d="M8 2a5.5 5.5 0 0 0-4.828 8.133L2 14l3.99-1.165A5.5 5.5 0 1 0 8 2Zm0 1.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
    </svg>
  );
}

function TriggerButton({
  tone,
  label,
  anchorType,
  anchorKey,
  anchorLabel,
  count,
}: {
  tone: "internal" | "candidate";
  label: string;
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  anchorLabel: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={triggerClassName(tone)}
      data-commission-anchor-trigger="true"
      data-commission-anchor-mode={tone === "internal" ? "internal" : "candidate"}
      data-commission-anchor-type={anchorType}
      data-commission-anchor-key={anchorKey}
      data-commission-anchor-label={anchorLabel}
    >
      <TriggerIcon tone={tone} />
      <span className="sr-only">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className={badgeClassName(tone)}>{count}</span>
      ) : null}
    </button>
  );
}

export function CommissionAnchorTriggerMarkup({
  anchorType,
  anchorKey,
  label,
  allowCandidateFeedback = true,
  canMutateCandidateFeedback,
  canMutateInternalNotes,
  candidateCount = 0,
  internalCount = 0,
  hasCandidateDraft = false,
}: Props) {
  const tCommission = useTranslations("commission");

  if (!canMutateCandidateFeedback && !canMutateInternalNotes) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {canMutateCandidateFeedback && allowCandidateFeedback ? (
        <TriggerButton
          tone="candidate"
          label={
            hasCandidateDraft
              ? tCommission("annotations.editCandidateButton")
              : tCommission("annotations.addCandidateButton")
          }
          anchorType={anchorType}
          anchorKey={anchorKey}
          anchorLabel={label}
          count={candidateCount}
        />
      ) : null}
      {canMutateInternalNotes ? (
        <TriggerButton
          tone="internal"
          label={tCommission("notes.addInline")}
          anchorType={anchorType}
          anchorKey={anchorKey}
          anchorLabel={label}
          count={internalCount}
        />
      ) : null}
    </div>
  );
}
