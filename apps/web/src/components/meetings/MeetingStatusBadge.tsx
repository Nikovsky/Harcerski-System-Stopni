// @file: apps/web/src/components/meetings/MeetingStatusBadge.tsx
import type { MeetingStatus } from "@hss/schemas";

type Props = {
  status: MeetingStatus;
  label: string;
};

const STATUS_CLASS: Record<Props["status"], string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  OPEN_FOR_REGISTRATION: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-sky-100 text-sky-800",
  CANCELLED: "bg-rose-100 text-rose-800",
};

export function MeetingStatusBadge({ status, label }: Props) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {label}
    </span>
  );
}
