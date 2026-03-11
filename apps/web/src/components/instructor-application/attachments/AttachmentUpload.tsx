// @file: apps/web/src/components/instructor-application/attachments/AttachmentUpload.tsx
"use client";

import { AttachmentUploadShared } from "@/components/instructor-application/attachments/AttachmentUploadShared";
import type { AttachmentResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  attachments: AttachmentResponse[];
  readOnly?: boolean;
  isHufcowyPresence?: boolean;
  onAttachmentsChange?: (attachments: AttachmentResponse[]) => void;
  onBeforeUpload?: () => Promise<void>;
};

export function AttachmentUpload({
  applicationId,
  attachments: initialAttachments,
  readOnly,
  isHufcowyPresence,
  onAttachmentsChange,
  onBeforeUpload,
}: Props) {
  return (
    <AttachmentUploadShared
      applicationId={applicationId}
      initialAttachments={initialAttachments}
      readOnly={readOnly}
      isHufcowyPresence={isHufcowyPresence}
      variant="detailed"
      onAttachmentsChange={onAttachmentsChange}
      onBeforeUpload={onBeforeUpload}
    />
  );
}
