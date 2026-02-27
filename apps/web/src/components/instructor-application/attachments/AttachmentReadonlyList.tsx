// @file: apps/web/src/components/instructor-application/attachments/AttachmentReadonlyList.tsx
"use client";

import { useTranslations } from "next-intl";
import { AttachmentDownloadLink } from "@/components/instructor-application/attachments/AttachmentDownloadLink";
import type { AttachmentResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  attachments: AttachmentResponse[];
  variant?: "compact" | "detailed";
  viewLabel?: string;
  downloadLabel?: string;
};

export function AttachmentReadonlyList({
  applicationId,
  attachments,
  variant = "compact",
  viewLabel,
  downloadLabel,
}: Props) {
  const t = useTranslations("applications");
  const effectiveViewLabel = viewLabel ?? t("actions.view");
  const effectiveDownloadLabel = downloadLabel ?? t("actions.download");

  if (variant === "detailed") {
    return (
      <ul className="space-y-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.uuid}
            className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{attachment.originalFilename}</p>
              <p className="text-xs text-foreground/40">
                {(attachment.sizeBytes / 1024).toFixed(0)} KB &middot;{" "}
                {new Date(attachment.uploadedAt).toLocaleDateString("pl-PL")}
              </p>
            </div>
            <div className="ml-4 flex shrink-0 gap-2 text-xs">
              <AttachmentDownloadLink
                applicationId={applicationId}
                attachment={attachment}
                showFilename={false}
                viewLabel={effectiveViewLabel}
                downloadLabel={effectiveDownloadLabel}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="text-xs text-foreground/60 space-y-0.5">
      {attachments.map((attachment) => (
        <li key={attachment.uuid}>
          <AttachmentDownloadLink
            applicationId={applicationId}
            attachment={attachment}
            viewLabel={effectiveViewLabel}
            downloadLabel={effectiveDownloadLabel}
          />
        </li>
      ))}
    </ul>
  );
}
