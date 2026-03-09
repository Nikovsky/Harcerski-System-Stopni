// @file: apps/web/src/components/meetings/MeetingStatusBadge.tsx
import type { MeetingStatus } from "@hss/schemas";

type Props = {
  status: MeetingStatus;
  label: string;
};

const STATUS_CLASS: Record<Props["status"], string> = {
  DRAFT: "border-border/80 bg-muted/45 text-foreground/80",
  OPEN_FOR_REGISTRATION:
    "border-emerald-400/45 bg-emerald-500/12 text-foreground",
  CLOSED: "border-amber-400/45 bg-amber-500/12 text-foreground",
  COMPLETED: "border-sky-400/45 bg-sky-500/12 text-foreground",
  CANCELLED: "border-rose-400/45 bg-rose-500/12 text-foreground",
};

export function MeetingStatusBadge({ status, label }: Props) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${STATUS_CLASS[status]}`}
    >
      {label}
    </span>
  );
}
