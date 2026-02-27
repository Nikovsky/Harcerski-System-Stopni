// @file: apps/web/src/components/instructor-application/attachments/AttachmentUploadButton.tsx
"use client";

type Props = {
  variant: "detailed" | "compact";
  uploading: boolean;
  label: string;
  onClick: () => void;
};

export function AttachmentUploadButton({ variant, uploading, label, onClick }: Props) {
  const className =
    variant === "detailed"
      ? "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
      : "rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uploading}
      className={className}
    >
      {uploading ? "..." : label}
    </button>
  );
}
