// @file: apps/web/src/components/instructor-application/RequirementForm.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import { canPreviewInline } from "@/lib/attachment-utils";
import { ALLOWED_EXTENSIONS_REGEX, MAX_FILE_SIZE } from "@hss/schemas";
import type { RequirementRowResponse, AttachmentResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  requirements: RequirementRowResponse[];
  readOnly?: boolean;
};

export function RequirementForm({ applicationId, requirements, readOnly }: Props) {
  const t = useTranslations("applications");

  // Group requirements by parentId
  const groups = requirements.reduce(
    (acc, r) => {
      const key = r.definition.parentId ?? "__root__";
      (acc[key] ??= []).push(r);
      return acc;
    },
    {} as Record<string, RequirementRowResponse[]>,
  );

  // All top-level definitions (groups + standalone)
  const allDefs = requirements.map((r) => r.definition);
  const topLevel = allDefs.filter((d) => !d.parentId);
  const uniqueTopLevel = [...new Map(topLevel.map((d) => [d.uuid, d])).values()].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <div className="space-y-4">
      {uniqueTopLevel.map((def) => {
        if (def.isGroup) {
          const children = groups[def.uuid] ?? [];
          return (
            <div key={def.uuid} className="rounded-lg border border-border p-3">
              <h4 className="mb-3 text-sm font-semibold">
                {def.code}. {def.description}
              </h4>
              <div className="space-y-3 pl-4">
                {children
                  .sort((a, b) => a.definition.sortOrder - b.definition.sortOrder)
                  .map((req) => (
                    <RequirementRow
                      key={req.uuid}
                      applicationId={applicationId}
                      req={req}
                      readOnly={readOnly}
                    />
                  ))}
              </div>
            </div>
          );
        }

        const req = requirements.find((r) => r.definition.uuid === def.uuid);
        if (!req) return null;
        return (
          <RequirementRow
            key={req.uuid}
            applicationId={applicationId}
            req={req}
            readOnly={readOnly}
          />
        );
      })}
    </div>
  );
}

function RequirementRow({
  applicationId,
  req,
  readOnly,
}: {
  applicationId: string;
  req: RequirementRowResponse;
  readOnly?: boolean;
}) {
  const t = useTranslations("applications");
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [state, setState] = useState<string>(req.state);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const mutation = useMutation({
    mutationFn: (data: { state: string; actionDescription: string; verificationText?: string | null }) =>
      apiFetch(`instructor-applications/${applicationId}/requirements/${req.uuid}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-application", applicationId] });
    },
  });

  const save = useCallback(
    (newState: string, actionDescription: string, verificationText?: string | null) => {
      if (readOnly) return;
      if (newState === "DONE" && (!verificationText || !verificationText.trim())) {
        setVerificationError(t("messages.verificationTextError"));
        return;
      }
      setVerificationError(null);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        mutation.mutate({ state: newState, actionDescription, verificationText });
      }, 500);
    },
    [readOnly, mutation, t],
  );

  const attachments = req.attachments ?? [];

  return (
    <div className="rounded border border-border/50 p-3">
      <p className="mb-2 text-sm">
        <span className="font-medium">{req.definition.code}.</span>{" "}
        {req.definition.description}
      </p>
      {!readOnly ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={state}
              onChange={(e) => {
                const newState = e.target.value;
                setState(newState);
                save(newState, req.actionDescription, req.verificationText);
              }}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="PLANNED">{t("requirementState.PLANNED")}</option>
              <option value="DONE">{t("requirementState.DONE")}</option>
            </select>
          </div>

          <textarea
            defaultValue={req.actionDescription}
            placeholder="Opis realizacji..."
            onBlur={(e) => save(state, e.target.value, req.verificationText)}
            rows={2}
            maxLength={5000}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />

          {state === "PLANNED" ? (
            <div>
              <label className="block text-xs text-foreground/60 mb-1">
                Co w przyszłości będzie załącznikiem/dowodem?
              </label>
              <textarea
                defaultValue={req.verificationText ?? ""}
                placeholder="Np. zaświadczenie z kursu, zdjęcia z obozu..."
                onBlur={(e) => save(state, req.actionDescription, e.target.value || null)}
                rows={1}
                maxLength={5000}
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-foreground/60 mb-1">
                  {t("verificationTextRequired")}
                </label>
                <textarea
                  defaultValue={req.verificationText ?? ""}
                  placeholder="Dodatkowy opis dowodu realizacji..."
                  onBlur={(e) => save(state, req.actionDescription, e.target.value || null)}
                  rows={1}
                  required
                  maxLength={5000}
                  className={`w-full rounded border bg-background px-2 py-1 text-sm ${
                    verificationError ? "border-red-500" : "border-border"
                  }`}
                />
                {verificationError && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{verificationError}</p>
                )}
              </div>
              <RequirementAttachments
                applicationId={applicationId}
                requirementUuid={req.uuid}
                attachments={attachments}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                req.state === "DONE"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}
            >
              {t(`requirementState.${req.state}` as any)}
            </span>
            {req.actionDescription && (
              <p className="text-foreground/70">{req.actionDescription}</p>
            )}
          </div>
          {req.verificationText && (
            <p className="text-xs text-foreground/50">{req.verificationText}</p>
          )}
          {attachments.length > 0 && (
            <ul className="text-xs text-foreground/60 space-y-0.5">
              {attachments.map((a) => (
                <li key={a.uuid}>
                  <AttachmentDownloadLink applicationId={applicationId} attachment={a} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RequirementAttachments({
  applicationId,
  requirementUuid,
  attachments,
}: {
  applicationId: string;
  requirementUuid: string;
  attachments: AttachmentResponse[];
}) {
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
      const { url, objectKey } = await apiFetch<{ url: string; objectKey: string }>(
        `instructor-applications/${applicationId}/attachments/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            requirementUuid,
          }),
        },
      );

      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      await apiFetch(`instructor-applications/${applicationId}/attachments/confirm`, {
        method: "POST",
        body: JSON.stringify({
          objectKey,
          originalFilename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          requirementUuid,
        }),
      });

      qc.invalidateQueries({ queryKey: ["instructor-application", applicationId] });
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(toUserFriendlyUploadError(err, t));
      } else {
        setUploadError(t("messages.uploadError"));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
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
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          {uploading ? "..." : t("actions.uploadFile")}
        </button>
      </div>

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

      {attachments.length > 0 && (
        <ul className="mt-1 space-y-1">
          {attachments.map((att) => (
            <li
              key={att.uuid}
              className="flex items-center justify-between text-xs"
            >
              <span className="truncate">{att.originalFilename}</span>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(att.uuid)}
                className="ml-2 text-red-600 hover:underline"
              >
                {t("actions.removeFile")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function toUserFriendlyUploadError(
  err: ApiError,
  t: ReturnType<typeof useTranslations<"applications">>,
): string {
  const msg = err.message.toLowerCase();

  // Zod validation errors or magic bytes rejection — file type issues
  if (
    msg.includes("rozszerzenie") ||
    msg.includes("typ pliku") ||
    msg.includes("mime") ||
    msg.includes("extension") ||
    msg.includes("content type") ||
    msg.includes("nie jest dozwolony")
  ) {
    return t("messages.uploadInvalidType");
  }

  // File too large
  if (msg.includes("size") || msg.includes("rozmiar") || msg.includes("za duż")) {
    return t("messages.uploadTooLarge");
  }

  // Attachment limit reached — backend already returns Polish message
  if (msg.includes("limit") && msg.includes("załącznik")) {
    return err.message;
  }

  // Any other validation error — show generic upload error
  if (err.code === "VALIDATION_ERROR") {
    return t("messages.uploadInvalidType");
  }

  return t("messages.uploadError");
}

function AttachmentDownloadLink({
  applicationId,
  attachment,
}: {
  applicationId: string;
  attachment: AttachmentResponse;
}) {
  const previewable = canPreviewInline(attachment.contentType);

  async function handleAction(inline: boolean) {
    try {
      const qs = inline ? "?inline=true" : "";
      const { url } = await apiFetch<{ url: string }>(
        `instructor-applications/${applicationId}/attachments/${attachment.uuid}/download${qs}`,
      );
      if (inline) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.originalFilename;
        a.click();
      }
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
        {attachment.originalFilename}
      </button>
      {previewable && (
        <button
          type="button"
          onClick={() => handleAction(false)}
          className="text-foreground/40 hover:underline"
        >
          (pobierz)
        </button>
      )}
    </span>
  );
}
