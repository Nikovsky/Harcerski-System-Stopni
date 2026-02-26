// @file: apps/web/src/components/instructor-application/AttachmentUpload.tsx
"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import { ALLOWED_EXTENSIONS_REGEX, MAX_FILE_SIZE } from "@hss/schemas";
import type { AttachmentResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  attachments: AttachmentResponse[];
  readOnly?: boolean;
  isHufcowyPresence?: boolean;
};

export function AttachmentUpload({ applicationId, attachments, readOnly, isHufcowyPresence }: Props) {
  const t = useTranslations("applications");
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      apiFetch(`instructor-applications/${applicationId}/attachments/${attachmentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-application", applicationId] });
    },
  });

  async function handleUpload(file: File) {
    setUploadError(null);

    if (!ALLOWED_EXTENSIONS_REGEX.test(file.name)) {
      setUploadError(t("messages.uploadInvalidType"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(t("messages.uploadTooLarge"));
      return;
    }

    setUploading(true);
    try {
      // 1. Get presigned URL
      const { url, objectKey } = await apiFetch<{ url: string; objectKey: string }>(
        `instructor-applications/${applicationId}/attachments/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
        },
      );

      // 2. Upload directly to MinIO
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      // 3. Confirm
      await apiFetch(`instructor-applications/${applicationId}/attachments/confirm`, {
        method: "POST",
        body: JSON.stringify({
          objectKey,
          originalFilename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          ...(isHufcowyPresence && { isHufcowyPresence: true }),
        }),
      });

      qc.invalidateQueries({ queryKey: ["instructor-application", applicationId] });
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.message.toLowerCase();
        if (
          msg.includes("rozszerzenie") || msg.includes("typ pliku") ||
          msg.includes("mime") || msg.includes("nie jest dozwolony")
        ) {
          setUploadError(t("messages.uploadInvalidType"));
        } else if (msg.includes("size") || msg.includes("rozmiar") || msg.includes("za duż")) {
          setUploadError(t("messages.uploadTooLarge"));
        } else if (msg.includes("limit") && msg.includes("załącznik")) {
          setUploadError(err.message);
        } else {
          setUploadError(t("messages.uploadError"));
        }
      } else {
        setUploadError(t("messages.uploadError"));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            {uploading ? "..." : t("actions.uploadFile")}
          </button>

          {uploadError && (
            <div className="mt-1 flex items-start gap-1.5 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <span className="shrink-0 mt-0.5">!</span>
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="ml-auto shrink-0 text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((att) => (
            <li
              key={att.uuid}
              className="flex items-center justify-between rounded border border-border/50 p-2 text-sm"
            >
              <span className="truncate">{att.originalFilename}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/50">
                  {(att.sizeBytes / 1024).toFixed(0)} KB
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(att.uuid)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {t("actions.removeFile")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
