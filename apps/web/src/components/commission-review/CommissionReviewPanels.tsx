// @file: apps/web/src/components/commission-review/CommissionReviewPanels.tsx
"use client";

import { useTranslations } from "next-intl";
import { CommissionCandidateFeedbackTab } from "@/components/commission-review/CommissionCandidateFeedbackTab";
import { CommissionCommentsClient } from "@/components/commission-review/CommissionCommentsClient";
import { CommissionHistorySection } from "@/components/commission-review/CommissionHistorySection";
import { CommissionInlineAnnotationTrigger } from "@/components/commission-review/CommissionInlineAnnotationTrigger";
import { useCommissionReviewInteractions } from "@/components/commission-review/CommissionReviewInteractionProvider";
import type {
  CommissionReviewApplicationDetail,
  CommissionReviewInternalNote,
  InstructorReviewAnchorType,
  RequirementRowResponse,
} from "@hss/schemas";

type CommissionAnchorDescriptor = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
};

type CandidateFeedbackPanelProps = {
  locale: string;
  applicationUuid: string;
  detail: CommissionReviewApplicationDetail;
  canMutateCandidateFeedback: boolean;
  canModerateCandidateFeedback: boolean;
};

type CommentsPanelProps = {
  notes: CommissionReviewInternalNote[];
  currentUserUuid: string;
  canCreate: boolean;
  canEdit: boolean;
};

type HistoryPanelProps = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
  timeline: CommissionReviewApplicationDetail["timeline"];
  requirements: RequirementRowResponse[];
  applicationUpdatedAt: string;
  lastSubmittedAt: string | null;
  activeRevisionRequest: CommissionReviewApplicationDetail["activeRevisionRequest"];
};

function CandidateFeedbackInlineActions({
  anchor,
  allowCandidateFeedback = true,
}: {
  anchor: CommissionAnchorDescriptor;
  allowCandidateFeedback?: boolean;
}) {
  const tCommission = useTranslations("commission");
  const interactions = useCommissionReviewInteractions();

  if (
    !interactions.canMutateInternalNotes &&
    !interactions.canMutateCandidateFeedback
  ) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {interactions.canMutateCandidateFeedback && allowCandidateFeedback ? (
        <CommissionInlineAnnotationTrigger
          label={
            interactions.getDraftAnnotation(anchor.anchorType, anchor.anchorKey)
              ? tCommission("annotations.editCandidateButton")
              : tCommission("annotations.addCandidateButton")
          }
          count={interactions.getCandidateAnnotationCount(
            anchor.anchorType,
            anchor.anchorKey,
          )}
          onClick={() => interactions.openDrawer(anchor, "candidate")}
        />
      ) : null}
      {interactions.canMutateInternalNotes ? (
        <CommissionInlineAnnotationTrigger
          label={tCommission("notes.addInline")}
          count={interactions.getInternalNoteCount(
            anchor.anchorType,
            anchor.anchorKey,
          )}
          tone="internal"
          onClick={() => interactions.openDrawer(anchor, "internal")}
        />
      ) : null}
    </div>
  );
}

export function CommissionReviewCandidateFeedbackPanel({
  locale,
  applicationUuid,
  detail,
  canMutateCandidateFeedback,
  canModerateCandidateFeedback,
}: CandidateFeedbackPanelProps) {
  const interactions = useCommissionReviewInteractions();

  return (
    <CommissionCandidateFeedbackTab
      locale={locale}
      applicationUuid={applicationUuid}
      detail={detail}
      renderInlineActions={(anchor, options) => (
        <CandidateFeedbackInlineActions
          anchor={anchor}
          allowCandidateFeedback={options?.allowCandidateFeedback}
        />
      )}
      resolveAnchorLabel={interactions.resolveAnchorLabel}
      onEditDraft={(annotation) =>
        interactions.openDrawer(
          {
            anchorType: annotation.anchorType,
            anchorKey: annotation.anchorKey,
            label: interactions.resolveAnchorLabel(annotation),
          },
          "candidate",
          {
            draftAnnotation: annotation,
          },
        )
      }
      canMutateCandidateFeedback={canMutateCandidateFeedback}
      canModerateCandidateFeedback={canModerateCandidateFeedback}
    />
  );
}

export function CommissionReviewCommentsPanel({
  notes,
  currentUserUuid,
  canCreate,
  canEdit,
}: CommentsPanelProps) {
  const interactions = useCommissionReviewInteractions();

  return (
    <CommissionCommentsClient
      notes={notes}
      currentUserUuid={currentUserUuid}
      canCreate={canCreate}
      canEdit={canEdit}
      onCreateApplicationNote={() =>
        interactions.openDrawer(
          {
            anchorType: "APPLICATION",
            anchorKey: interactions.applicationUuid,
            label: interactions.resolveAnchorLabel({
              anchorType: "APPLICATION",
              anchorKey: interactions.applicationUuid,
            }),
          },
          "internal",
        )
      }
      onEditNote={(note) =>
        interactions.openDrawer(
          {
            anchorType: note.anchorType,
            anchorKey: note.anchorKey,
            label: interactions.resolveAnchorLabel(note),
          },
          "internal",
          {
            internalNote: note,
          },
        )
      }
      resolveAnchorLabel={interactions.resolveAnchorLabel}
    />
  );
}

export function CommissionReviewHistoryPanel({
  locale,
  commissionUuid,
  applicationUuid,
  timeline,
  requirements,
  applicationUpdatedAt,
  lastSubmittedAt,
  activeRevisionRequest,
}: HistoryPanelProps) {
  const interactions = useCommissionReviewInteractions();

  return (
    <CommissionHistorySection
      locale={locale}
      commissionUuid={commissionUuid}
      applicationUuid={applicationUuid}
      timeline={timeline}
      requirements={requirements}
      applicationUpdatedAt={applicationUpdatedAt}
      lastSubmittedAt={lastSubmittedAt}
      activeRevisionRequest={activeRevisionRequest}
      resolveAnchorLabel={interactions.resolveAnchorLabel}
    />
  );
}
