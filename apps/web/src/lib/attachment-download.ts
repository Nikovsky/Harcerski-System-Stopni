// @file: apps/web/src/lib/attachment-download.ts
import { apiFetch } from "@/lib/api";
import type { AttachmentResponse } from "@hss/schemas";

export async function downloadAttachment(
  applicationId: string,
  attachment: AttachmentResponse,
  inline: boolean,
): Promise<void> {
  const qs = inline ? "?inline=true" : "";
  const { url } = await apiFetch<{ url: string }>(
    `instructor-applications/${applicationId}/attachments/${attachment.uuid}/download${qs}`,
  );

  if (inline) {
    window.open(url, "_blank");
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = attachment.originalFilename;
  a.click();
}
