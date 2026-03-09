// @file: apps/web/src/components/meetings/MeetingsCommissionBadge.tsx
"use client";

import { useTranslations } from "next-intl";
import type { MeetingListItem } from "@hss/schemas";

type Props = {
  commissionType: MeetingListItem["commissionType"];
  compact?: boolean;
};

type DisplayCommissionType =
  | NonNullable<MeetingListItem["commissionType"]>
  | "UNKNOWN";

const COMMISSION_STYLE: Record<DisplayCommissionType, string> = {
  INSTRUCTOR:
    "border border-sky-400/45 bg-sky-500/12 text-foreground shadow-sm",
  SCOUT:
    "border border-amber-400/45 bg-amber-500/14 text-foreground shadow-sm",
  UNKNOWN: "border border-border/70 bg-muted/45 text-foreground/80 shadow-sm",
};

const COMMISSION_LABEL_KEY: Record<DisplayCommissionType, string> = {
  INSTRUCTOR: "commissionType.INSTRUCTOR",
  SCOUT: "commissionType.SCOUT",
  UNKNOWN: "commissionType.UNKNOWN",
};

const COMMISSION_SHORT_LABEL_KEY: Record<DisplayCommissionType, string> = {
  INSTRUCTOR: "commissionTypeShort.INSTRUCTOR",
  SCOUT: "commissionTypeShort.SCOUT",
  UNKNOWN: "commissionTypeShort.UNKNOWN",
};

function normalizeCommissionType(
  value: MeetingListItem["commissionType"],
): DisplayCommissionType {
  return value ?? "UNKNOWN";
}

export function MeetingsCommissionBadge({
  commissionType,
  compact = false,
}: Props) {
  const t = useTranslations("meetings");
  const normalizedType = normalizeCommissionType(commissionType);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        COMMISSION_STYLE[normalizedType],
      ].join(" ")}
    >
      {t(
        compact
          ? COMMISSION_SHORT_LABEL_KEY[normalizedType]
          : COMMISSION_LABEL_KEY[normalizedType],
      )}
    </span>
  );
}
