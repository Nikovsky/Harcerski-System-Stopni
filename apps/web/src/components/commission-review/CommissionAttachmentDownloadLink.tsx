// @file: apps/web/src/components/commission-review/CommissionAttachmentDownloadLink.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import { canPreviewInline } from "@/lib/attachment-utils";
import type { CommissionReviewAttachmentDownloadResponse } from "@hss/schemas/commission-review";
import type { AttachmentResponse } from "@hss/schemas/instructor-application";

type Props = {
  commissionUuid: string;
  applicationUuid: string;
  attachment: AttachmentResponse;
  showFilename?: boolean;
  viewLabel?: string;
  downloadLabel?: string;
};

export function CommissionAttachmentDownloadLink({
  commissionUuid,
  applicationUuid,
  attachment,
  showFilename = true,
  viewLabel,
  downloadLabel,
}: Props) {
  const t = useTranslations("commission");
  const previewable = canPreviewInline(attachment.contentType);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleAction(inline: boolean) {
    setDownloadError(null);

    try {
      const qs = inline ? "?inline=true" : "";
      const response = await apiFetch<CommissionReviewAttachmentDownloadResponse>(
        `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/attachments/${attachment.uuid}/download${qs}`,
      );

      if (inline) {
        window.open(response.url, "_blank", "noopener,noreferrer");
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = response.url;
      anchor.download = response.filename;
      anchor.click();
    } catch (error: unknown) {
      setDownloadError(
        error instanceof ApiError
          ? error.message
          : t("messages.downloadError"),
      );
    }
  }

  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => handleAction(previewable)}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {showFilename
            ? attachment.originalFilename
            : previewable
              ? (viewLabel ?? t("actions.view"))
              : (downloadLabel ?? t("actions.download"))}
        </button>
        {previewable && (
          <button
            type="button"
            onClick={() => handleAction(false)}
            className="text-foreground/75 hover:text-foreground hover:underline"
          >
            {showFilename
              ? `(${downloadLabel ?? t("actions.download")})`
              : (downloadLabel ?? t("actions.download"))}
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
