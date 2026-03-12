// @file: apps/web/src/components/commission-review/CommissionStatusActions.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { statusKey } from "@/lib/applications-i18n";
import { apiFetchValidated, ApiError } from "@/lib/api";
import {
  IA_BUTTON_PRIMARY_SM,
  IA_BUTTON_SECONDARY_SM,
} from "@/components/instructor-application/ui/button-classnames";
import {
  commissionReviewRevisionRequestCancelResponseSchema,
  commissionReviewRevisionRequestPublishResponseSchema,
  commissionReviewStatusTransitionResponseSchema,
  type ApplicationStatus,
  type CommissionReviewApplicationDetail,
} from "@hss/schemas";

type Props = {
  commissionUuid: string;
  applicationUuid: string;
  currentStatus: ApplicationStatus;
  permissions: CommissionReviewApplicationDetail["permissions"];
  availableTransitions: ApplicationStatus[];
  activeRevisionRequest: CommissionReviewApplicationDetail["activeRevisionRequest"];
};

type WorkflowUiState = {
  refreshKey: string;
  selectedStatus: ApplicationStatus | null;
  actionError: string | null;
};

export function CommissionStatusActions({
  commissionUuid,
  applicationUuid,
  currentStatus,
  permissions,
  availableTransitions,
  activeRevisionRequest,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nonFixTransitions: ApplicationStatus[] = useMemo(
    () => availableTransitions.filter((status) => status !== "TO_FIX"),
    [availableTransitions],
  );
  const workflowRefreshKey = [
    currentStatus,
    activeRevisionRequest?.uuid ?? "",
    activeRevisionRequest?.status ?? "",
    activeRevisionRequest?.updatedAt ?? "",
    nonFixTransitions.join("|"),
  ].join(":");
  const defaultSelectedStatus = nonFixTransitions[0] ?? null;
  const [workflowUiState, setWorkflowUiState] = useState<WorkflowUiState>(
    () => ({
      refreshKey: workflowRefreshKey,
      selectedStatus: defaultSelectedStatus,
      actionError: null,
    }),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDraftCandidateFeedback =
    permissions.canDraftCandidateFeedback ?? permissions.canDraftFixRequest;
  const canModerateCandidateFeedback = permissions.canModerateCandidateFeedback;
  const canPublishCandidateFeedback = permissions.canPublishCandidateFeedback;
  const canChangeStatus = permissions.canChangeStatus;
  const draftAnnotationCount =
    activeRevisionRequest?.status === "DRAFT"
      ? activeRevisionRequest.annotations.length
      : 0;

  const selectedStatus =
    workflowUiState.refreshKey === workflowRefreshKey &&
    workflowUiState.selectedStatus &&
    nonFixTransitions.includes(workflowUiState.selectedStatus)
      ? workflowUiState.selectedStatus
      : defaultSelectedStatus;
  const actionError =
    workflowUiState.refreshKey === workflowRefreshKey
      ? workflowUiState.actionError
      : null;

  function getStatusLabel(status: ApplicationStatus): string {
    const translatedStatusKey = statusKey(status);
    return translatedStatusKey ? tApplications(translatedStatusKey) : status;
  }

  async function handleCancelDraft() {
    if (
      !canModerateCandidateFeedback ||
      activeRevisionRequest?.status !== "DRAFT"
    ) {
      return;
    }

    setWorkflowUiState((previous) => ({
      refreshKey: workflowRefreshKey,
      selectedStatus: selectedStatus ?? previous.selectedStatus,
      actionError: null,
    }));
    setIsSubmitting(true);

    try {
      await apiFetchValidated(
        commissionReviewRevisionRequestCancelResponseSchema,
        `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/revision-request/cancel`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error: unknown) {
      setWorkflowUiState({
        refreshKey: workflowRefreshKey,
        selectedStatus,
        actionError:
          error instanceof ApiError
            ? error.message
            : tCommission("messages.statusChangeError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublishDraft() {
    if (
      !canPublishCandidateFeedback ||
      activeRevisionRequest?.status !== "DRAFT"
    ) {
      return;
    }

    setWorkflowUiState((previous) => ({
      refreshKey: workflowRefreshKey,
      selectedStatus: selectedStatus ?? previous.selectedStatus,
      actionError: null,
    }));
    setIsSubmitting(true);

    try {
      await apiFetchValidated(
        commissionReviewRevisionRequestPublishResponseSchema,
        `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/revision-request/publish`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error: unknown) {
      setWorkflowUiState({
        refreshKey: workflowRefreshKey,
        selectedStatus,
        actionError:
          error instanceof ApiError
            ? error.message
            : tCommission("messages.statusChangeError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTransition(nextStatus: ApplicationStatus) {
    if (!canChangeStatus) {
      return;
    }

    setWorkflowUiState((previous) => ({
      refreshKey: workflowRefreshKey,
      selectedStatus: selectedStatus ?? previous.selectedStatus,
      actionError: null,
    }));
    setIsSubmitting(true);

    try {
      await apiFetchValidated(
        commissionReviewStatusTransitionResponseSchema,
        `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            toStatus: nextStatus,
          }),
        },
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error: unknown) {
      setWorkflowUiState({
        refreshKey: workflowRefreshKey,
        selectedStatus,
        actionError:
          error instanceof ApiError
            ? error.message
            : tCommission("messages.statusChangeError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderRevisionRequestMeta(): string {
    if (!activeRevisionRequest) {
      return tCommission("workflow.feedback.none");
    }

    if (activeRevisionRequest.status === "DRAFT") {
      return tCommission("workflow.feedback.draftReady", {
        count: draftAnnotationCount,
      });
    }

    return tCommission("workflow.feedback.publishedAt", {
      publishedAt: new Date(
        activeRevisionRequest.publishedAt ?? activeRevisionRequest.updatedAt,
      ).toLocaleString(),
    });
  }

  return (
    <section className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {tCommission("workflow.title")}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            {tCommission("workflow.description")}
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/60">
          {getStatusLabel(currentStatus)}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
              {tCommission("workflow.feedback.title")}
            </p>
            <p className="mt-2 text-sm text-foreground/70">
              {renderRevisionRequestMeta()}
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/60">
            {activeRevisionRequest?.status
              ? tCommission(`feedback.status.${activeRevisionRequest.status}`)
              : tCommission("feedback.status.NONE")}
          </span>
        </div>

        {activeRevisionRequest?.status === "DRAFT" && (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {canModerateCandidateFeedback && (
              <button
                type="button"
                onClick={() => void handleCancelDraft()}
                disabled={isSubmitting || isPending}
                className={`${IA_BUTTON_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {tCommission("feedback.cancelDraft")}
              </button>
            )}
            {canPublishCandidateFeedback && (
              <button
                type="button"
                onClick={() => void handlePublishDraft()}
                disabled={
                  isSubmitting || isPending || draftAnnotationCount === 0
                }
                className={`${IA_BUTTON_PRIMARY_SM} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSubmitting || isPending
                  ? tCommission("workflow.saving")
                  : tCommission("workflow.publishDraft")}
              </button>
            )}
          </div>
        )}
      </div>

      {canChangeStatus && nonFixTransitions.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border/70 bg-muted/10 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/45">
            {tCommission("workflow.controlTitle")}
          </h3>
          <p className="mt-2 text-sm text-foreground/60">
            {tCommission("workflow.controlDescription")}
          </p>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-foreground/80">
              {tCommission("workflow.statusLabel")}
            </span>
            <select
              value={selectedStatus ?? ""}
              onChange={(event) =>
                setWorkflowUiState({
                  refreshKey: workflowRefreshKey,
                  selectedStatus: event.target.value as ApplicationStatus,
                  actionError: null,
                })
              }
              disabled={isSubmitting || isPending}
              className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm"
            >
              {nonFixTransitions.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                selectedStatus && void handleTransition(selectedStatus)
              }
              disabled={isSubmitting || isPending || !selectedStatus}
              className={`${IA_BUTTON_PRIMARY_SM} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isSubmitting || isPending
                ? tCommission("workflow.saving")
                : selectedStatus
                  ? tCommission("workflow.applyStatus", {
                      status: getStatusLabel(selectedStatus),
                    })
                  : tCommission("workflow.noActions")}
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {!canChangeStatus &&
        !canDraftCandidateFeedback &&
        !canModerateCandidateFeedback && (
          <p className="mt-4 text-sm text-foreground/60">
            {tCommission("workflow.noActions")}
          </p>
        )}
    </section>
  );
}
