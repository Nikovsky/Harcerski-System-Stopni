// @file: apps/web/src/components/instructor-application/attachments/AttachmentDownloadLink.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { downloadAttachment } from "@/lib/attachment-download";
import { canPreviewInline } from "@/lib/attachment-utils";
import type { AttachmentResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  attachment: AttachmentResponse;
  showFilename?: boolean;
  viewLabel?: string;
  downloadLabel?: string;
};

export function AttachmentDownloadLink({
  applicationId,
  attachment,
  showFilename = true,
  viewLabel,
  downloadLabel,
}: Props) {
  const t = useTranslations("applications");
  const previewable = canPreviewInline(attachment.contentType);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleAction(inline: boolean) {
    setDownloadError(null);
    try {
      await downloadAttachment(applicationId, attachment, inline);
    } catch {
      setDownloadError(t("messages.downloadError"));
    }
  }

  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => handleAction(previewable)}
          className="text-primary hover:underline"
        >
          {showFilename
            ? attachment.originalFilename
            : previewable
              ? (viewLabel ?? "View")
              : (downloadLabel ?? "Download")}
        </button>
        {previewable && (
          <button
            type="button"
            onClick={() => handleAction(false)}
            className="text-foreground/40 hover:underline"
          >
            {showFilename ? `(${downloadLabel ?? "Download"})` : (downloadLabel ?? "Download")}
          </button>
        )}
      </span>
      {downloadError && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {downloadError}
        </span>
      )}
    </span>
  );
}
