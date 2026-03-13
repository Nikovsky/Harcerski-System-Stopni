// @file: apps/web/src/components/commission-review/CommissionReviewInteractionProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { CommissionCandidateFeedbackTab } from "@/components/commission-review/CommissionCandidateFeedbackTab";
import { CommissionCommentsClient } from "@/components/commission-review/CommissionCommentsClient";
import { CommissionHistorySection } from "@/components/commission-review/CommissionHistorySection";
import { CommissionInlineAnnotationTrigger } from "@/components/commission-review/CommissionInlineAnnotationTrigger";
import type {
  CommissionReviewApplicationDetail,
  CommissionReviewCandidateAnnotation,
  CommissionReviewInternalNote,
  InstructorReviewAnchorType,
  RequirementRowResponse,
} from "@hss/schemas";

export type CommissionAnchorDescriptor = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
};

export type CommissionAnchorLabelReference = Pick<
  CommissionReviewCandidateAnnotation,
  "anchorType" | "anchorKey"
> & { label?: string | undefined };

export type CommissionAnchorCountEntry = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  count: number;
};

type AnnotationMode = "candidate" | "internal";

type DrawerState = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
  defaultMode: AnnotationMode;
  draftAnnotation?: CommissionReviewCandidateAnnotation | null;
  internalNote?: CommissionReviewInternalNote | null;
};

type CommissionReviewInteractionContextValue = {
  commissionUuid: string;
  applicationUuid: string;
  canMutateInternalNotes: boolean;
  canMutateCandidateFeedback: boolean;
  drawerState: DrawerState | null;
  closeDrawer: () => void;
  openDrawer: (
    anchor: CommissionAnchorDescriptor,
    defaultMode: AnnotationMode,
    options?: {
      draftAnnotation?: CommissionReviewCandidateAnnotation | null;
      internalNote?: CommissionReviewInternalNote | null;
    },
  ) => void;
  getCandidateAnnotationCount: (
    anchorType: InstructorReviewAnchorType,
    anchorKey: string,
  ) => number;
  getInternalNoteCount: (
    anchorType: InstructorReviewAnchorType,
    anchorKey: string,
  ) => number;
  getDraftAnnotation: (
    anchorType: InstructorReviewAnchorType,
    anchorKey: string,
  ) => CommissionReviewCandidateAnnotation | null;
  resolveAnchorLabel: (reference: CommissionAnchorLabelReference) => string;
};

type ProviderProps = {
  children: ReactNode;
  commissionUuid: string;
  applicationUuid: string;
  canMutateInternalNotes: boolean;
  canMutateCandidateFeedback: boolean;
  anchorLabels: Record<string, string>;
  candidateAnnotationCounts: CommissionAnchorCountEntry[];
  internalNoteCounts: CommissionAnchorCountEntry[];
  draftAnnotations: CommissionReviewCandidateAnnotation[];
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

function anchorIdentity(
  anchorType: InstructorReviewAnchorType,
  anchorKey: string,
): string {
  return `${anchorType}:${anchorKey}`;
}

const CommissionReviewInteractionContext =
  createContext<CommissionReviewInteractionContextValue | null>(null);

export function useCommissionReviewInteractions(): CommissionReviewInteractionContextValue {
  const context = useContext(CommissionReviewInteractionContext);

  if (!context) {
    throw new Error(
      "Commission review interaction context is unavailable outside its provider.",
    );
  }

  return context;
}

export function CommissionReviewInteractionProvider({
  children,
  commissionUuid,
  applicationUuid,
  canMutateInternalNotes,
  canMutateCandidateFeedback,
  anchorLabels,
  candidateAnnotationCounts,
  internalNoteCounts,
  draftAnnotations,
}: ProviderProps) {
  const [drawerState, setDrawerState] = useState<DrawerState | null>(null);

  const candidateCountsByAnchor = useMemo(
    () =>
      new Map(
        candidateAnnotationCounts.map((entry) => [
          anchorIdentity(entry.anchorType, entry.anchorKey),
          entry.count,
        ]),
      ),
    [candidateAnnotationCounts],
  );

  const internalCountsByAnchor = useMemo(
    () =>
      new Map(
        internalNoteCounts.map((entry) => [
          anchorIdentity(entry.anchorType, entry.anchorKey),
          entry.count,
        ]),
      ),
    [internalNoteCounts],
  );

  const draftAnnotationByAnchor = useMemo(() => {
    const annotations = new Map<string, CommissionReviewCandidateAnnotation>();

    for (const annotation of draftAnnotations) {
      const key = anchorIdentity(annotation.anchorType, annotation.anchorKey);
      if (!annotations.has(key)) {
        annotations.set(key, annotation);
      }
    }

    return annotations;
  }, [draftAnnotations]);

  const contextValue = useMemo<CommissionReviewInteractionContextValue>(
    () => ({
      commissionUuid,
      applicationUuid,
      canMutateInternalNotes,
      canMutateCandidateFeedback,
      drawerState,
      closeDrawer: () => setDrawerState(null),
      openDrawer: (anchor, defaultMode, options) => {
        setDrawerState({
          ...anchor,
          defaultMode,
          draftAnnotation:
            options?.draftAnnotation ??
            (defaultMode === "candidate"
              ? (draftAnnotationByAnchor.get(
                  anchorIdentity(anchor.anchorType, anchor.anchorKey),
                ) ?? null)
              : null),
          internalNote: options?.internalNote ?? null,
        });
      },
      getCandidateAnnotationCount: (anchorType, anchorKey) =>
        candidateCountsByAnchor.get(anchorIdentity(anchorType, anchorKey)) ?? 0,
      getInternalNoteCount: (anchorType, anchorKey) =>
        internalCountsByAnchor.get(anchorIdentity(anchorType, anchorKey)) ?? 0,
      getDraftAnnotation: (anchorType, anchorKey) =>
        draftAnnotationByAnchor.get(anchorIdentity(anchorType, anchorKey)) ?? null,
      resolveAnchorLabel: (reference) =>
        reference.label?.trim() ||
        anchorLabels[anchorIdentity(reference.anchorType, reference.anchorKey)] ||
        reference.anchorKey,
    }),
    [
      anchorLabels,
      applicationUuid,
      canMutateCandidateFeedback,
      canMutateInternalNotes,
      candidateCountsByAnchor,
      commissionUuid,
      drawerState,
      draftAnnotationByAnchor,
      internalCountsByAnchor,
    ],
  );

  return (
    <CommissionReviewInteractionContext.Provider value={contextValue}>
      {children}
    </CommissionReviewInteractionContext.Provider>
  );
}

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
