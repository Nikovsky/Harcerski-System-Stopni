// @file: apps/web/src/components/instructor-application/requirements/RequirementAttachments.tsx
"use client";

import { AttachmentUploadShared } from "@/components/instructor-application/attachments/AttachmentUploadShared";
import type { AttachmentResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  requirementUuid: string;
  initialAttachments: AttachmentResponse[];
};

export function RequirementAttachments({
  applicationId,
  requirementUuid,
  initialAttachments,
}: Props) {
  return (
    <AttachmentUploadShared
      applicationId={applicationId}
      requirementUuid={requirementUuid}
      initialAttachments={initialAttachments}
      variant="compact"
    />
  );
}
