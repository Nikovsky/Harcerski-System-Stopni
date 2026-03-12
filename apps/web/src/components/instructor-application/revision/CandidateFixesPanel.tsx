// @file: apps/web/src/components/instructor-application/revision/CandidateFixesPanel.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IA_BUTTON_PRIMARY_MD,
  IA_BUTTON_SECONDARY_SM,
} from "@/components/instructor-application/ui/button-classnames";
import {
  CANDIDATE_FIX_STEPS,
  type CandidateFixStepId,
  type CandidateFixTarget,
} from "./candidate-fix-targets";
import {
  ChangeStatusBadge,
  type ChangeSummary,
} from "@/components/instructor-application/ui/ChangeSummary";

type Props = {
  activeStep: number;
  targets: CandidateFixTarget[];
  progressByTargetId: Record<string, ChangeSummary>;
  onOpenTarget: (target: CandidateFixTarget) => void;
};

type QueueUiState = {
  signature: string;
  selectedAnnotationUuid: string | null;
};

type GroupUiState = {
  signature: string;
  openStepId: CandidateFixStepId | null;
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6.5L8 10L12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CandidateFixesPanel({
  activeStep,
  targets,
  progressByTargetId,
  onOpenTarget,
}: Props) {
  const t = useTranslations("applications");
  const actionableTargets = targets.filter((target) => !target.isGeneral);
  const generalTargets = targets.filter((target) => target.isGeneral);
  const [expandedTargetIds, setExpandedTargetIds] = useState<string[]>([]);

  const groupedTargets = CANDIDATE_FIX_STEPS.map((stepId, stepIndex) => ({
    stepId,
    stepIndex,
    targets: actionableTargets.filter(
      (target) => target.stepIndex === stepIndex,
    ),
  })).filter((group) => group.targets.length > 0);

  const shouldGroupByStep = groupedTargets.length > 1;
  const activeGroupStepId =
    groupedTargets.find((group) => group.stepIndex === activeStep)?.stepId ??
    groupedTargets[0]?.stepId ??
    null;
  const actionableTargetSignature = actionableTargets
    .map((target) => target.annotationUuid)
    .join("|");
  const groupUiSignature = [
    shouldGroupByStep ? "grouped" : "flat",
    activeGroupStepId ?? "",
    groupedTargets.map((group) => group.stepId).join("|"),
  ].join(":");
  const [queueUiState, setQueueUiState] = useState<QueueUiState>(() => ({
    signature: actionableTargetSignature,
    selectedAnnotationUuid: actionableTargets[0]?.annotationUuid ?? null,
  }));
  const [groupUiState, setGroupUiState] = useState<GroupUiState>(() => ({
    signature: groupUiSignature,
    openStepId: shouldGroupByStep ? activeGroupStepId : null,
  }));
  const selectedAnnotationUuid =
    queueUiState.signature === actionableTargetSignature
      ? queueUiState.selectedAnnotationUuid
      : (actionableTargets[0]?.annotationUuid ?? null);
  const currentIndex = selectedAnnotationUuid
    ? Math.max(
        0,
        actionableTargets.findIndex(
          (target) => target.annotationUuid === selectedAnnotationUuid,
        ),
      )
    : 0;
  const openGroupStepId =
    groupUiState.signature === groupUiSignature
      ? groupUiState.openStepId
      : shouldGroupByStep
        ? activeGroupStepId
        : null;
  const currentQueueTarget = actionableTargets[currentIndex] ?? null;
  const currentQueueStepLabel = currentQueueTarget
    ? t(`steps.${currentQueueTarget.stepId}`)
    : null;

  function toggleExpandedTarget(targetId: string): void {
    setExpandedTargetIds((previousIds) =>
      previousIds.includes(targetId)
        ? previousIds.filter((previousId) => previousId !== targetId)
        : [...previousIds, targetId],
    );
  }

  function openTarget(target: CandidateFixTarget, index: number): void {
    setQueueUiState({
      signature: actionableTargetSignature,
      selectedAnnotationUuid: actionableTargets[index]?.annotationUuid ?? null,
    });
    setGroupUiState({
      signature: groupUiSignature,
      openStepId: target.stepId,
    });
    setExpandedTargetIds((previousIds) =>
      previousIds.includes(target.annotationUuid)
        ? previousIds
        : [...previousIds, target.annotationUuid],
    );
    onOpenTarget(target);
  }

  function canToggleDetails(target: CandidateFixTarget): boolean {
    return target.preview !== target.body;
  }

  function moveInQueue(direction: -1 | 1): void {
    if (actionableTargets.length === 0) {
      return;
    }

    const nextIndex =
      (currentIndex + direction + actionableTargets.length) %
      actionableTargets.length;

    openTarget(actionableTargets[nextIndex], nextIndex);
  }

  function getTargetProgress(
    target: CandidateFixTarget,
  ): ChangeSummary | undefined {
    const progressId = target.progressId ?? target.targetId;

    if (!progressId) {
      return undefined;
    }

    return progressByTargetId[progressId];
  }

  function countChangedTargets(stepTargets: CandidateFixTarget[]): number {
    return stepTargets.filter((target) => getTargetProgress(target)?.isChanged)
      .length;
  }

  function renderTargetCard(target: CandidateFixTarget, index: number) {
    const isExpanded = expandedTargetIds.includes(target.annotationUuid);
    const isToggleVisible = canToggleDetails(target);
    const isCurrent = index === currentIndex;
    const progress = getTargetProgress(target);

    return (
      <article
        key={target.annotationUuid}
        className={`rounded-2xl border p-4 ${
          isCurrent
            ? "border-sky-300 bg-background dark:border-sky-800"
            : "border-border/70 bg-background/80"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground/90">
                {target.label}
              </p>
              <ChangeStatusBadge changeSummary={progress} />
            </div>
            {target.context ? (
              <p className="mt-1 truncate text-xs text-foreground/55">
                {target.context}
              </p>
            ) : null}
            <p
              className={`mt-2 text-sm text-foreground/80 ${
                isExpanded ? "leading-6" : "truncate"
              }`}
            >
              {isExpanded ? target.body : target.preview}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openTarget(target, index)}
              className={IA_BUTTON_PRIMARY_MD}
            >
              {t("candidateEditScope.jumpToTarget")}
            </button>
            {isToggleVisible ? (
              <button
                type="button"
                onClick={() => toggleExpandedTarget(target.annotationUuid)}
                className={IA_BUTTON_SECONDARY_SM}
              >
                {isExpanded
                  ? t("candidateEditScope.hideFixDetails")
                  : t("candidateEditScope.showFixDetails")}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="rounded-2xl border border-sky-300 bg-sky-50/80 p-4 dark:border-sky-900 dark:bg-sky-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-900 dark:text-sky-200">
            {t("candidateEditScope.fixesPanelTitle")}
          </p>
          <p className="mt-1 text-sm text-foreground/75">
            {t("candidateEditScope.fixesPanelDescription")}
          </p>
        </div>
        {actionableTargets.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-300 px-3 py-1 text-xs font-medium text-sky-900 dark:border-sky-800 dark:text-sky-200">
              {t("candidateEditScope.reviewQueueProgress", {
                current: currentIndex + 1,
                total: actionableTargets.length,
              })}
            </span>
            <button
              type="button"
              onClick={() => moveInQueue(-1)}
              className={IA_BUTTON_SECONDARY_SM}
            >
              {t("candidateEditScope.previousFix")}
            </button>
            <button
              type="button"
              onClick={() => moveInQueue(1)}
              className={IA_BUTTON_SECONDARY_SM}
            >
              {t("candidateEditScope.nextFix")}
            </button>
          </div>
        ) : null}
      </div>

      {currentQueueTarget &&
      currentQueueTarget.stepIndex !== activeStep &&
      currentQueueStepLabel ? (
        <p className="mt-3 text-sm text-foreground/70">
          {t("candidateEditScope.currentFixHint", {
            step: currentQueueStepLabel,
          })}
        </p>
      ) : null}

      {generalTargets.length > 0 ? (
        <div
          data-fix-target="general-annotations"
          tabIndex={-1}
          className="mt-4 scroll-mt-32 rounded-2xl border border-amber-300/70 bg-amber-50/80 p-4 outline-none dark:border-amber-900/70 dark:bg-amber-950/20"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-900 dark:text-amber-200">
                {t("candidateEditScope.generalAnnotationsLabel")}
              </p>
              <p className="mt-1 text-sm text-foreground/75">
                {t("candidateEditScope.generalAnnotationsDescription")}
              </p>
            </div>
            <span className="rounded-full border border-amber-300 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-800 dark:text-amber-200">
              {generalTargets.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {generalTargets.map((target) => {
              const isExpanded = expandedTargetIds.includes(
                target.annotationUuid,
              );
              const isToggleVisible = canToggleDetails(target);
              const progress = getTargetProgress(target);

              return (
                <article
                  key={target.annotationUuid}
                  className="rounded-2xl border border-amber-300/70 bg-background/80 p-4 dark:border-amber-900/70"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground/90">
                          {target.label}
                        </p>
                        <ChangeStatusBadge changeSummary={progress} />
                      </div>
                      {target.context ? (
                        <p className="mt-1 truncate text-xs text-foreground/55">
                          {target.context}
                        </p>
                      ) : null}
                      <p
                        className={`mt-2 text-sm text-foreground/80 ${
                          isExpanded ? "leading-6" : "truncate"
                        }`}
                      >
                        {isExpanded ? target.body : target.preview}
                      </p>
                    </div>
                    {isToggleVisible ? (
                      <button
                        type="button"
                        onClick={() =>
                          toggleExpandedTarget(target.annotationUuid)
                        }
                        className={IA_BUTTON_SECONDARY_SM}
                      >
                        {isExpanded
                          ? t("candidateEditScope.hideFixDetails")
                          : t("candidateEditScope.showFixDetails")}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {shouldGroupByStep
          ? groupedTargets.map((group) => {
              const changedCount = countChangedTargets(group.targets);

              return (
                <div key={group.stepId} className="space-y-3">
                  <button
                    type="button"
                    aria-expanded={openGroupStepId === group.stepId}
                    onClick={() =>
                      setGroupUiState({
                        signature: groupUiSignature,
                        openStepId:
                          openGroupStepId === group.stepId
                            ? null
                            : group.stepId,
                      })
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      openGroupStepId === group.stepId
                        ? "border-sky-300 bg-background dark:border-sky-800"
                        : "border-border/70 bg-background/70 hover:bg-background/90"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground/85">
                        {t(`steps.${group.stepId}`)}
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {changedCount > 0
                          ? t("candidateEditScope.changedProgress", {
                              changed: changedCount,
                              total: group.targets.length,
                            })
                          : group.stepIndex === activeStep
                            ? t("candidateEditScope.currentStepHint")
                            : t("candidateEditScope.stepHasFixesHint")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-foreground/70">
                        {group.targets.length}
                      </span>
                      <span className="text-foreground/60">
                        <ChevronIcon
                          expanded={openGroupStepId === group.stepId}
                        />
                      </span>
                    </div>
                  </button>

                  {openGroupStepId === group.stepId ? (
                    <div className="space-y-3">
                      {group.targets.map((target) => {
                        const targetIndex = actionableTargets.findIndex(
                          (candidateTarget) =>
                            candidateTarget.annotationUuid ===
                            target.annotationUuid,
                        );

                        return renderTargetCard(target, targetIndex);
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          : actionableTargets.map((target) => {
              const targetIndex = actionableTargets.findIndex(
                (candidateTarget) =>
                  candidateTarget.annotationUuid === target.annotationUuid,
              );

              return renderTargetCard(target, targetIndex);
            })}
      </div>
    </section>
  );
}
