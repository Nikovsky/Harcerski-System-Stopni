// @file: apps/web/src/components/commission-review/CommissionAnnotationDrawerHost.tsx
"use client";

import dynamic from "next/dynamic";
import { useCommissionReviewInteractions } from "@/components/commission-review/CommissionReviewInteractionProvider";

const LazyCommissionAnnotationDrawer = dynamic(
  () =>
    import("@/components/commission-review/CommissionAnnotationDrawer").then(
      (module) => module.CommissionAnnotationDrawer,
    ),
  {
    loading: () => null,
  },
);

export function CommissionAnnotationDrawerHost() {
  const interactions = useCommissionReviewInteractions();
  const drawerState = interactions.drawerState;

  if (!drawerState) {
    return null;
  }

  return (
    <LazyCommissionAnnotationDrawer
      open
      onClose={interactions.closeDrawer}
      commissionUuid={interactions.commissionUuid}
      applicationUuid={interactions.applicationUuid}
      anchor={{
        anchorType: drawerState.anchorType,
        anchorKey: drawerState.anchorKey,
        label: drawerState.label,
      }}
      canCreateInternal={interactions.canMutateInternalNotes}
      canCreateCandidate={interactions.canMutateCandidateFeedback}
      defaultMode={drawerState.defaultMode}
      draftAnnotation={drawerState.draftAnnotation ?? null}
      internalNote={drawerState.internalNote ?? null}
    />
  );
}
