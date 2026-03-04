// @file: apps/web/src/lib/attachment-utils.ts
const INLINE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
]);

export function canPreviewInline(contentType: string): boolean {
  return INLINE_MIME_TYPES.has(contentType);
}
