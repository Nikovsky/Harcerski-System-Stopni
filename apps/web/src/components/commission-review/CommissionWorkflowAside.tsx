// @file: apps/web/src/components/commission-review/CommissionWorkflowAside.tsx
"use client";

import { CommissionStatusActions } from "@/components/commission-review/CommissionStatusActions";
import type {
  ApplicationStatus,
  CommissionReviewApplicationDetail,
} from "@hss/schemas";

type Props = {
  commissionUuid: string;
  applicationUuid: string;
  currentStatus: ApplicationStatus;
  permissions: CommissionReviewApplicationDetail["permissions"];
  availableTransitions: ApplicationStatus[];
  activeRevisionRequest: CommissionReviewApplicationDetail["activeRevisionRequest"];
};

export function CommissionWorkflowAside({
  commissionUuid,
  applicationUuid,
  currentStatus,
  permissions,
  availableTransitions,
  activeRevisionRequest,
}: Props) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      <CommissionStatusActions
        commissionUuid={commissionUuid}
        applicationUuid={applicationUuid}
        currentStatus={currentStatus}
        permissions={permissions}
        availableTransitions={availableTransitions}
        activeRevisionRequest={activeRevisionRequest}
      />
    </aside>
  );
}
