// @file: apps/web/src/components/commission-review/CommissionApplicationDetail.tsx

import Link from "next/link";
import { useTranslations } from "next-intl";
import { degreeKey, statusKey } from "@/lib/applications-i18n";
import { ApplicationStatusBadge } from "@/components/instructor-application/ui/ApplicationStatusBadge";
import { IA_BUTTON_SECONDARY_SM } from "@/components/instructor-application/ui/button-classnames";
import {
  CommissionApplicationTab,
  APPLICATION_FIELDS,
  SERVICE_HISTORY_FIELDS,
  SUPERVISOR_FIELDS,
} from "@/components/commission-review/CommissionApplicationTab";
import { CommissionAnchorActionDelegator } from "@/components/commission-review/CommissionAnchorActionDelegator";
import { CommissionAnnotationDrawerHost } from "@/components/commission-review/CommissionAnnotationDrawerHost";
import { CommissionRequirementsTab } from "@/components/commission-review/CommissionRequirementsTab";
import {
  CommissionReviewCandidateFeedbackPanel,
  CommissionReviewCommentsPanel,
  CommissionReviewHistoryPanel,
} from "@/components/commission-review/CommissionReviewPanels";
import {
  buildAnchorCountEntries,
  buildAnchorInteractionMeta,
  buildAnchorLabels,
} from "@/components/commission-review/commission-review-anchor-model";
import {
  CommissionReviewInteractionProvider,
} from "@/components/commission-review/CommissionReviewInteractionProvider";
import {
  CommissionWorkspaceTabs,
  type CommissionWorkspaceTabId,
} from "@/components/commission-review/CommissionWorkspaceTabs";
import { CommissionWorkflowAside } from "@/components/commission-review/CommissionWorkflowAside";
import type {
  CommissionReviewApplicationDetail as CommissionReviewApplicationDetailResponse,
} from "@hss/schemas";

type Props = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
  activeTab: CommissionWorkspaceTabId;
  detail: CommissionReviewApplicationDetailResponse;
};

function formatDateTime(
  locale: string,
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale === "en" ? "en-GB" : "pl-PL");
}

export function CommissionApplicationDetail({
  locale,
  commissionUuid,
  applicationUuid,
  activeTab,
  detail,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const app = detail.application;
  const activeRevisionRequest = detail.activeRevisionRequest;
  const translatedDegreeKey = degreeKey(app.template.degreeCode);
  const degreeLabel = translatedDegreeKey
    ? tApplications(translatedDegreeKey)
    : app.template.degreeCode;
  const translatedStatusKey = statusKey(app.status);
  const statusLabel = translatedStatusKey
    ? tApplications(translatedStatusKey)
    : app.status;
  const candidateName =
    [app.candidateProfile.firstName, app.candidateProfile.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    app.candidateProfile.email ||
    tCommission("detail.unknownCandidate");
  const canMutateInternalNotes = detail.permissions.canComment;
  const canMutateCandidateFeedback =
    (detail.permissions.canDraftCandidateFeedback ??
      detail.permissions.canDraftFixRequest) &&
    (activeRevisionRequest === null ||
      activeRevisionRequest.status === "DRAFT");
  const canManageWorkflow =
    detail.permissions.canManageWorkflow ||
    detail.permissions.canPublishCandidateFeedback ||
    detail.permissions.canChangeStatus;
  const canModerateCandidateFeedback =
    detail.permissions.canModerateCandidateFeedback;
  const summaryItems = [
    {
      label: tCommission("detail.lastSubmittedAt"),
      value: formatDateTime(locale, app.lastSubmittedAt),
    },
    {
      label: tCommission("detail.updatedAt"),
      value: formatDateTime(locale, app.updatedAt),
    },
    {
      label: tCommission("detail.feedbackStatus"),
      value: activeRevisionRequest?.status
        ? tCommission(`feedback.status.${activeRevisionRequest.status}`)
        : tCommission("feedback.status.NONE"),
    },
    {
      label: tCommission("detail.noteCount"),
      value: tCommission("notes.count", { count: detail.internalNotes.length }),
    },
  ];
  const tabs = [
    {
      id: "application" as const,
      label: tCommission("workspace.tabs.application"),
    },
    {
      id: "requirements" as const,
      label: tCommission("workspace.tabs.requirements"),
      badge: app.requirements.filter(
        (requirement) => !requirement.definition.isGroup,
      ).length,
    },
    {
      id: "candidateFeedback" as const,
      label: tCommission("workspace.tabs.candidateFeedback"),
      badge:
        activeRevisionRequest?.annotations.filter(
          (annotation) => annotation.status !== "CANCELLED",
        ).length ?? 0,
    },
    {
      id: "internalNotes" as const,
      label: tCommission("workspace.tabs.internalNotes"),
      badge: detail.internalNotes.length,
    },
    {
      id: "history" as const,
      label: tCommission("workspace.tabs.history"),
      badge: detail.timeline.length,
    },
  ];
  const anchorLabels = buildAnchorLabels({
    applicationUuid,
    detail,
    tCommission,
    tApplications,
    applicationFields: APPLICATION_FIELDS,
    supervisorFields: SUPERVISOR_FIELDS,
    serviceHistoryFields: SERVICE_HISTORY_FIELDS,
  });
  const candidateAnnotationCounts = buildAnchorCountEntries(
    (activeRevisionRequest?.annotations ?? []).filter(
      (annotation) => annotation.status !== "CANCELLED",
    ),
  );
  const internalNoteCounts = buildAnchorCountEntries(detail.internalNotes);
  const draftAnnotations = activeRevisionRequest?.annotations ?? [];
  const anchorInteractionMeta = buildAnchorInteractionMeta({
    candidateAnnotationCounts,
    internalNoteCounts,
    draftAnnotations,
  });
  const anchorScopeId = `commission-anchor-scope-${applicationUuid}`;
  const interactionProviderProps = {
    commissionUuid,
    applicationUuid,
    canMutateInternalNotes,
    canMutateCandidateFeedback,
    anchorLabels,
    candidateAnnotationCounts,
    internalNoteCounts,
    draftAnnotations: draftAnnotations.filter(
      (annotation) => annotation.status === "DRAFT",
    ),
  };

  return (
    <>
      <main className="mx-auto max-w-[1560px] px-4 py-8">
        <header className="rounded-3xl border border-border bg-gradient-to-br from-background via-background to-muted/50 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/75">
                <span className="rounded-full border border-border px-3 py-1">
                  {tCommission(`types.${detail.membership.commissionType}`)}
                </span>
                <span className="rounded-full border border-border px-3 py-1">
                  {tCommission(`roles.${detail.membership.commissionRole}`)}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                {candidateName}
              </h1>
              <p className="mt-2 break-words text-sm text-foreground/75">
                {degreeLabel} ·{" "}
                {app.candidateProfile.email ?? tCommission("detail.noEmail")}
              </p>
              <div className="mt-4">
                <ApplicationStatusBadge status={app.status} label={statusLabel} />
              </div>
            </div>

            <Link
              href={`/${locale}/commission/${commissionUuid}`}
              className={IA_BUTTON_SECONDARY_SM}
            >
              {tCommission("detail.backToInbox")}
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryItems.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-border/70 bg-background/80 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-foreground/85">
                  {item.value}
                </p>
              </article>
            ))}
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section id={anchorScopeId} className="min-w-0 space-y-5">
            <CommissionWorkspaceTabs
              tabs={tabs}
              activeTab={activeTab}
              basePath={`/${locale}/commission/${commissionUuid}/applications/${applicationUuid}`}
              ariaLabel={tCommission("detail.sectionNavLabel")}
            />

            {activeTab === "application" ? (
              <CommissionApplicationTab
                locale={locale}
                commissionUuid={commissionUuid}
                applicationUuid={applicationUuid}
                application={app}
                canMutateCandidateFeedback={canMutateCandidateFeedback}
                canMutateInternalNotes={canMutateInternalNotes}
                anchorInteractionMeta={anchorInteractionMeta}
              />
            ) : null}

            {activeTab === "requirements" ? (
              <CommissionRequirementsTab
                locale={locale}
                commissionUuid={commissionUuid}
                applicationUuid={applicationUuid}
                application={app}
                canMutateCandidateFeedback={canMutateCandidateFeedback}
                canMutateInternalNotes={canMutateInternalNotes}
                anchorInteractionMeta={anchorInteractionMeta}
              />
            ) : null}

            {activeTab === "candidateFeedback" ? (
              <CommissionReviewInteractionProvider {...interactionProviderProps}>
                <CommissionReviewCandidateFeedbackPanel
                  locale={locale}
                  applicationUuid={applicationUuid}
                  detail={detail}
                  canMutateCandidateFeedback={canMutateCandidateFeedback}
                  canModerateCandidateFeedback={canModerateCandidateFeedback}
                />
                <CommissionAnnotationDrawerHost />
              </CommissionReviewInteractionProvider>
            ) : null}

            {activeTab === "internalNotes" ? (
              <CommissionReviewInteractionProvider {...interactionProviderProps}>
                <CommissionReviewCommentsPanel
                  notes={detail.internalNotes}
                  currentUserUuid={detail.membership.userUuid}
                  canCreate={canMutateInternalNotes}
                  canEdit={canMutateInternalNotes}
                />
                <CommissionAnnotationDrawerHost />
              </CommissionReviewInteractionProvider>
            ) : null}

            {activeTab === "history" ? (
              <CommissionReviewInteractionProvider {...interactionProviderProps}>
                <CommissionReviewHistoryPanel
                  locale={locale}
                  commissionUuid={commissionUuid}
                  applicationUuid={applicationUuid}
                  timeline={detail.timeline}
                  requirements={app.requirements}
                  applicationUpdatedAt={app.updatedAt}
                  lastSubmittedAt={app.lastSubmittedAt}
                  activeRevisionRequest={activeRevisionRequest}
                />
                <CommissionAnnotationDrawerHost />
              </CommissionReviewInteractionProvider>
            ) : null}
          </section>

          {canManageWorkflow ? (
            <CommissionWorkflowAside
              commissionUuid={commissionUuid}
              applicationUuid={applicationUuid}
              currentStatus={app.status}
              permissions={detail.permissions}
              availableTransitions={detail.availableTransitions}
              activeRevisionRequest={detail.activeRevisionRequest}
            />
          ) : null}
        </div>
      </main>
      {activeTab === "application" || activeTab === "requirements" ? (
        <CommissionReviewInteractionProvider {...interactionProviderProps}>
          <CommissionAnchorActionDelegator scopeId={anchorScopeId} />
          <CommissionAnnotationDrawerHost />
        </CommissionReviewInteractionProvider>
      ) : null}
    </>
  );
}
