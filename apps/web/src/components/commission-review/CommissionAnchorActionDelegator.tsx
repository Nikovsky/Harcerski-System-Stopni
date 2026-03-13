// @file: apps/web/src/components/commission-review/CommissionAnchorActionDelegator.tsx
"use client";

import { useEffect } from "react";
import type { InstructorReviewAnchorType } from "@hss/schemas";
import { useCommissionReviewInteractions } from "@/components/commission-review/CommissionReviewInteractionProvider";

type Props = {
  scopeId: string;
};

export function CommissionAnchorActionDelegator({ scopeId }: Props) {
  const interactions = useCommissionReviewInteractions();

  useEffect(() => {
    const scope = document.getElementById(scopeId);

    if (!scope) {
      return;
    }

    const scopeElement = scope;

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        return;
      }

      const trigger = event.target.closest<HTMLButtonElement>(
        "[data-commission-anchor-trigger='true']",
      );

      if (!trigger || !scopeElement.contains(trigger)) {
        return;
      }

      const anchorType = trigger.dataset
        .commissionAnchorType as InstructorReviewAnchorType | undefined;
      const anchorKey = trigger.dataset.commissionAnchorKey;
      const label = trigger.dataset.commissionAnchorLabel;
      const mode = trigger.dataset.commissionAnchorMode;

      if (!anchorType || !anchorKey || !label) {
        return;
      }

      event.preventDefault();
      interactions.openDrawer(
        {
          anchorType,
          anchorKey,
          label,
        },
        mode === "internal" ? "internal" : "candidate",
      );
    }

    scopeElement.addEventListener("click", handleClick);

    return () => {
      scopeElement.removeEventListener("click", handleClick);
    };
  }, [interactions, scopeId]);

  return null;
}
