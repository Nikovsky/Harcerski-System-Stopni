// @file: apps/web/src/components/instructor-application/AttachmentUpload.tsx
"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
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
