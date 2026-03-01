// @file: apps/web/src/components/instructor-application/attachments/AttachmentUploadShared.tsx
"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { AttachmentUploadButton } from "@/components/instructor-application/attachments/AttachmentUploadButton";
import { useAttachmentUpload } from "@/components/instructor-application/hooks/useAttachmentUpload";
import type { AttachmentResponse } from "@hss/schemas";

type UploadVariant = "detailed" | "compact";

type Props = {
  applicationId: string;
  initialAttachments: AttachmentResponse[];
  readOnly?: boolean;
  requirementUuid?: string;
  isHufcowyPresence?: boolean;
  variant: UploadVariant;
};

export function AttachmentUploadShared({
  applicationId,
  initialAttachments,
  readOnly,
  requirementUuid,
  isHufcowyPresence,
  variant,
}: Props) {
  const t = useTranslations("applications");
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    uploading,
    uploadError,
    clearUploadError,
    uploadAttachment,
  } = useAttachmentUpload(applicationId, { requirementUuid, isHufcowyPresence });

  async function handleDelete(attachmentId: string) {
    setDeletingId(attachmentId);
    try {
      await apiFetch(`instructor-applications/${applicationId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      setAttachments((prev) => prev.filter((a) => a.uuid !== attachmentId));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUpload(file: File) {
    try {
      const confirmed = await uploadAttachment(file);
      if (confirmed) {
        setAttachments((prev) => [...prev, confirmed]);
      }
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const isDetailed = variant === "detailed";

  return (
    <div className={isDetailed ? "space-y-3" : undefined}>
      {!readOnly && (
        <div className={isDetailed ? undefined : "flex items-center gap-2"}>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <AttachmentUploadButton
            variant={variant}
            uploading={uploading}
            label={t("actions.uploadFile")}
            onClick={() => fileRef.current?.click()}
          />

          {uploadError && (
            <div className="mt-1 flex items-start gap-1.5 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <span className="shrink-0 mt-0.5">!</span>
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={clearUploadError}
                className="ml-auto shrink-0 text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <ul className={isDetailed ? "space-y-2" : "mt-1 space-y-1"}>
          {attachments.map((att) => (
            <li
              key={att.uuid}
              className={
                isDetailed
                  ? "flex items-center justify-between rounded border border-border/50 p-2 text-sm"
                  : "flex items-center justify-between text-xs"
              }
            >
              <span className="truncate">{att.originalFilename}</span>
              {isDetailed ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground/50">
                    {(att.sizeBytes / 1024).toFixed(0)} KB
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(att.uuid)}
                      disabled={deletingId === att.uuid}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      {t("actions.removeFile")}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDelete(att.uuid)}
                  disabled={deletingId === att.uuid}
                  className="ml-2 text-red-600 hover:underline disabled:opacity-50"
                >
                  {t("actions.removeFile")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
