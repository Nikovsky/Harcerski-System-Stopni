// @file: apps/web/src/components/commission-review/CommissionReviewInteractionProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CommissionReviewCandidateAnnotation,
  CommissionReviewInternalNote,
  InstructorReviewAnchorType,
} from "@hss/schemas";
import {
  anchorIdentity,
  type CommissionAnchorCountEntry,
  type CommissionAnchorLabelReference,
} from "@/components/commission-review/commission-review-anchor-model";

export type CommissionAnchorDescriptor = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
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
