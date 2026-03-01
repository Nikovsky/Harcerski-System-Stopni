// @file: apps/web/src/lib/upload-utils.ts
import type { ApiError } from "@/lib/api";

export type UploadMessagesTranslator = (
  key: "messages.uploadInvalidType" | "messages.uploadTooLarge" | "messages.uploadError",
) => string;

export type RequirementMessagesTranslator = (
  key: "messages.requirementSaveError",
) => string;

type UnknownErrorMapper = {
  fallbackMessage: string;
  mapApiError?: (err: ApiError) => string | null;
};

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  doc: "application/x-cfb",
  docx: "application/zip",
  odt: "application/zip",
  mp4: "video/mp4",
  ppt: "application/x-cfb",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function getExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return null;
  return filename.slice(dot + 1).toLowerCase();
}

export function resolveUploadContentType(file: File): string | null {
  const normalizedBrowserType = file.type.trim().toLowerCase();
  if (normalizedBrowserType && normalizedBrowserType !== "application/octet-stream") {
    return normalizedBrowserType;
  }

  const ext = getExtension(file.name);
  if (!ext) return null;
  return EXTENSION_TO_MIME[ext] ?? null;
}

export function toUserFriendlyUploadError(
  err: ApiError,
  t: UploadMessagesTranslator,
): string {
  const msg = err.message.toLowerCase();

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

  if (msg.includes("size") || msg.includes("rozmiar") || msg.includes("za duż")) {
    return t("messages.uploadTooLarge");
  }

  if (msg.includes("limit") && msg.includes("załącznik")) {
    return err.message;
  }

  if (err.code === "VALIDATION_ERROR") {
    return t("messages.uploadInvalidType");
  }

  return t("messages.uploadError");
}

export function toUserFriendlyUploadErrorFromUnknown(
  err: unknown,
  t: UploadMessagesTranslator,
): string {
  return resolveUnknownErrorMessage(err, {
    fallbackMessage: t("messages.uploadError"),
    mapApiError: (apiErr) => toUserFriendlyUploadError(apiErr, t),
  });
}

export function toUserFriendlyRequirementSaveErrorFromUnknown(
  err: unknown,
  t: RequirementMessagesTranslator,
): string {
  return resolveUnknownErrorMessage(err, {
    fallbackMessage: t("messages.requirementSaveError"),
    mapApiError: (apiErr) =>
      apiErr.code === "VALIDATION_ERROR" ? t("messages.requirementSaveError") : null,
  });
}

function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && "status" in err && "code" in err;
}

function resolveUnknownErrorMessage(
  err: unknown,
  mapper: UnknownErrorMapper,
): string {
  if (isApiError(err) && mapper.mapApiError) {
    const mapped = mapper.mapApiError(err);
    if (mapped) {
      return mapped;
    }
  }

  return mapper.fallbackMessage;
}
