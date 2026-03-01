// @file: apps/web/src/components/instructor-application/ui/ApplicationStatusBadge.tsx
const COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  TO_FIX: "bg-orange-100 text-orange-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  REPORT_SUBMITTED: "bg-purple-100 text-purple-800",
  COMPLETED_POSITIVE: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export function ApplicationStatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const color = COLORS[status] ?? "bg-gray-200 text-gray-800";

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}
