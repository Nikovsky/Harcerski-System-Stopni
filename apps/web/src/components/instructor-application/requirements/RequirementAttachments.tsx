// @file: apps/web/src/components/instructor-application/requirements/RequirementAttachments.tsx
"use client";

import { AttachmentUploadShared } from "@/components/instructor-application/attachments/AttachmentUploadShared";
import type { AttachmentResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  requirementUuid: string;
  initialAttachments: AttachmentResponse[];
  readOnly?: boolean;
  onAttachmentsChange?: (
    requirementUuid: string,
    attachments: AttachmentResponse[],
  ) => void;
};

export function RequirementAttachments({
  applicationId,
  requirementUuid,
  initialAttachments,
  readOnly,
  onAttachmentsChange,
}: Props) {
  return (
    <AttachmentUploadShared
      applicationId={applicationId}
      requirementUuid={requirementUuid}
      initialAttachments={initialAttachments}
      readOnly={readOnly}
      variant="compact"
      onAttachmentsChange={(attachments) =>
        onAttachmentsChange?.(requirementUuid, attachments)
      }
    />
  );
}
