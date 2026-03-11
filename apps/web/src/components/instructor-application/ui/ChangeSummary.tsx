// @file: apps/web/src/components/instructor-application/ui/ChangeSummary.tsx
"use client";

import { useTranslations } from "next-intl";

export type ChangeSummary = {
  isChanged: boolean;
  beforeValue?: string;
  afterValue?: string;
};

type ChangeStatusBadgeProps = {
  changeSummary?: ChangeSummary;
};

type InlineChangeSummaryProps = {
  changeSummary?: ChangeSummary;
};

export function ChangeStatusBadge({ changeSummary }: ChangeStatusBadgeProps) {
  const t = useTranslations("applications");

  if (!changeSummary) {
    return null;
  }

  const isChanged = changeSummary.isChanged;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
        isChanged
          ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }`}
    >
      {isChanged
        ? t("candidateEditScope.changedBadge")
        : t("candidateEditScope.pendingBadge")}
    </span>
  );
}

export function InlineChangeSummary({
  changeSummary,
}: InlineChangeSummaryProps) {
  const t = useTranslations("applications");

  if (!changeSummary?.isChanged || !changeSummary.beforeValue || !changeSummary.afterValue) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs">
      <div className="min-w-0">
        <p className="font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
          {t("candidateEditScope.valueBeforeLabel")}
        </p>
        <p className="mt-1 break-words text-foreground/80">{changeSummary.beforeValue}</p>
      </div>
      <div className="min-w-0">
        <p className="font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
          {t("candidateEditScope.valueAfterLabel")}
        </p>
        <p className="mt-1 break-words text-foreground/80">{changeSummary.afterValue}</p>
      </div>
    </div>
  );
}
