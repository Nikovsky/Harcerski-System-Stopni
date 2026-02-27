// @file: apps/web/src/components/instructor-application/attachments/AttachmentDownloadLink.tsx
"use client";

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
  const previewable = canPreviewInline(attachment.contentType);

  async function handleAction(inline: boolean) {
    try {
      await downloadAttachment(applicationId, attachment, inline);
    } catch (e) {
      console.error("Download error:", e);
    }
  }

  return (
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
  );
}
