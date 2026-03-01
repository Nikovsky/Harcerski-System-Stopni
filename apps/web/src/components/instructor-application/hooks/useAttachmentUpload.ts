// @file: apps/web/src/components/instructor-application/hooks/useAttachmentUpload.ts
"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { resolveUploadContentType, toUserFriendlyUploadErrorFromUnknown } from "@/lib/upload-utils";
import { ALLOWED_EXTENSIONS_REGEX, MAX_FILE_SIZE } from "@hss/schemas";
import type { AttachmentResponse } from "@hss/schemas";

type UseAttachmentUploadOptions = {
  requirementUuid?: string;
  isHufcowyPresence?: boolean;
};

export function useAttachmentUpload(
  applicationId: string,
  options: UseAttachmentUploadOptions = {},
) {
  const t = useTranslations("applications");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadAttachment = useCallback(
    async (file: File): Promise<AttachmentResponse | null> => {
      setUploadError(null);

      if (!ALLOWED_EXTENSIONS_REGEX.test(file.name)) {
        setUploadError(t("messages.uploadInvalidType"));
        return null;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(t("messages.uploadTooLarge"));
        return null;
      }

      const resolvedContentType = resolveUploadContentType(file);
      if (!resolvedContentType) {
        setUploadError(t("messages.uploadInvalidType"));
        return null;
      }

      setUploading(true);
      try {
        const { url, objectKey } = await apiFetch<{ url: string; objectKey: string }>(
          `instructor-applications/${applicationId}/attachments/presign`,
          {
            method: "POST",
            body: JSON.stringify({
              filename: file.name,
              contentType: resolvedContentType,
              sizeBytes: file.size,
              ...(options.requirementUuid && { requirementUuid: options.requirementUuid }),
            }),
          },
        );

        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": resolvedContentType },
          body: file,
        });

        const confirmed = await apiFetch<AttachmentResponse>(
          `instructor-applications/${applicationId}/attachments/confirm`,
          {
            method: "POST",
            body: JSON.stringify({
              objectKey,
              originalFilename: file.name,
              contentType: resolvedContentType,
              sizeBytes: file.size,
              ...(options.requirementUuid && { requirementUuid: options.requirementUuid }),
              ...(options.isHufcowyPresence && { isHufcowyPresence: true }),
            }),
          },
        );

        return confirmed;
      } catch (err) {
        setUploadError(toUserFriendlyUploadErrorFromUnknown(err, t));
        return null;
      } finally {
        setUploading(false);
      }
    },
    [applicationId, options.isHufcowyPresence, options.requirementUuid, t],
  );

  return {
    uploading,
    uploadError,
    clearUploadError: () => setUploadError(null),
    uploadAttachment,
  };
}
