// @file: apps/web/src/components/commission-review/CommissionApplicationDetail.tsx
"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { degreeKey, statusKey } from "@/lib/applications-i18n";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import { ApplicationStatusBadge } from "@/components/instructor-application/ui/ApplicationStatusBadge";
import { IA_BUTTON_SECONDARY_SM } from "@/components/instructor-application/ui/button-classnames";
import { CommissionInlineAnnotationTrigger } from "@/components/commission-review/CommissionInlineAnnotationTrigger";
import {
  CommissionWorkspaceTabs,
  type CommissionWorkspaceTabId,
} from "@/components/commission-review/CommissionWorkspaceTabs";
import type {
  CommissionReviewApplicationDetail as CommissionReviewApplicationDetailResponse,
  CommissionReviewCandidateAnnotation,
  CommissionReviewInternalNote,
  InstructorReviewAnchorType,
} from "@hss/schemas";

type Props = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
  activeTab: CommissionWorkspaceTabId;
  detail: CommissionReviewApplicationDetailResponse;
};

type DrawerState = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
  defaultMode: "candidate" | "internal";
  draftAnnotation?: CommissionReviewCandidateAnnotation | null;
  internalNote?: CommissionReviewInternalNote | null;
};

type AnchorDescriptor = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
};

type AnchorReference = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label?: string;
};

const LazyCommissionAnnotationDrawer = dynamic(
  () =>
    import("@/components/commission-review/CommissionAnnotationDrawer").then(
      (module) => module.CommissionAnnotationDrawer,
    ),
  {
    loading: () => <InlinePanelSkeleton />,
  },
);

const LazyCommissionCommentsClient = dynamic(
  () =>
    import("@/components/commission-review/CommissionCommentsClient").then(
      (module) => module.CommissionCommentsClient,
    ),
  {
    loading: () => <SectionSkeleton />,
  },
);

const LazyCommissionApplicationTab = dynamic(
  () =>
    import("@/components/commission-review/CommissionApplicationTab").then(
      (module) => module.CommissionApplicationTab,
    ),
  {
    loading: () => <SectionSkeleton />,
  },
);

const LazyCommissionRequirementsTab = dynamic(
  () =>
    import("@/components/commission-review/CommissionRequirementsTab").then(
      (module) => module.CommissionRequirementsTab,
    ),
  {
    loading: () => <SectionSkeleton />,
  },
);

const LazyCommissionCandidateFeedbackTab = dynamic(
  () =>
    import("@/components/commission-review/CommissionCandidateFeedbackTab").then(
      (module) => module.CommissionCandidateFeedbackTab,
    ),
  {
    loading: () => <SectionSkeleton />,
  },
);

const LazyCommissionHistorySection = dynamic(
  () =>
    import("@/components/commission-review/CommissionHistorySection").then(
      (module) => module.CommissionHistorySection,
    ),
  {
    loading: () => <SectionSkeleton />,
  },
);

const LazyCommissionWorkflowAside = dynamic(
  () =>
    import("@/components/commission-review/CommissionWorkflowAside").then(
      (module) => module.CommissionWorkflowAside,
    ),
  {
    loading: () => <WorkflowSkeleton />,
  },
);

function formatDateTime(
  locale: string,
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale === "en" ? "en-GB" : "pl-PL");
}

function anchorKey(
  anchorType: InstructorReviewAnchorType,
  anchorValue: string,
): string {
  return `${anchorType}:${anchorValue}`;
}

function SectionSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-48 rounded-full bg-muted/70" />
        <div className="h-4 w-full max-w-3xl rounded-full bg-muted/60" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-24 rounded-2xl bg-muted/50" />
          <div className="h-24 rounded-2xl bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

function WorkflowSkeleton() {
  return (
    <section className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-40 rounded-full bg-muted/70" />
        <div className="h-4 w-full rounded-full bg-muted/60" />
        <div className="h-24 rounded-2xl bg-muted/50" />
        <div className="h-28 rounded-2xl bg-muted/50" />
      </div>
    </section>
  );
}

function InlinePanelSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-32 rounded-full bg-muted/70" />
        <div className="h-4 w-full rounded-full bg-muted/60" />
        <div className="h-24 rounded-2xl bg-muted/50" />
      </div>
    </div>
  );
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
  const [drawerState, setDrawerState] = useState<DrawerState | null>(null);

  const requirementLabelByUuid = useMemo(
    () =>
      new Map(
        app.requirements.map((requirement) => [
          requirement.uuid,
          `${requirement.definition.code}. ${requirement.definition.description}`,
        ]),
      ),
    [app.requirements],
  );

  const attachmentLabelByUuid = useMemo(() => {
    const labels = new Map<string, string>();

    for (const attachment of app.attachments) {
      labels.set(attachment.uuid, attachment.originalFilename);
    }

    for (const requirement of app.requirements) {
      for (const attachment of requirement.attachments ?? []) {
        labels.set(attachment.uuid, attachment.originalFilename);
      }
    }

    return labels;
  }, [app.attachments, app.requirements]);

  const internalNoteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of detail.internalNotes) {
      const key = anchorKey(note.anchorType, note.anchorKey);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [detail.internalNotes]);

  const candidateAnnotationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const annotation of activeRevisionRequest?.annotations ?? []) {
      if (annotation.status === "CANCELLED") {
        continue;
      }
      const key = anchorKey(annotation.anchorType, annotation.anchorKey);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [activeRevisionRequest]);

  const draftAnnotationByAnchor = useMemo(() => {
    const annotations = new Map<string, CommissionReviewCandidateAnnotation>();
    for (const annotation of activeRevisionRequest?.annotations ?? []) {
      if (annotation.status !== "DRAFT") {
        continue;
      }
      const key = anchorKey(annotation.anchorType, annotation.anchorKey);
      if (!annotations.has(key)) {
        annotations.set(key, annotation);
      }
    }
    return annotations;
  }, [activeRevisionRequest]);

  const candidateName =
    [app.candidateProfile.firstName, app.candidateProfile.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    app.candidateProfile.email ||
    tCommission("detail.unknownCandidate");

  const translatedDegreeKey = degreeKey(app.template.degreeCode);
  const degreeLabel = translatedDegreeKey
    ? tApplications(translatedDegreeKey)
    : app.template.degreeCode;
  const translatedStatusKey = statusKey(app.status);
  const statusLabel = translatedStatusKey
    ? tApplications(translatedStatusKey)
    : app.status;
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

  function resolveAnchorLabel(anchor: AnchorReference): string {
    switch (anchor.anchorType) {
      case "APPLICATION":
        return tCommission("anchors.application");
      case "FIELD":
        return getFieldLabel(anchor.anchorKey, tApplications, app.requirements);
      case "SECTION":
        return tCommission(`anchors.sections.${anchor.anchorKey}`);
      case "REQUIREMENT":
        return (
          requirementLabelByUuid.get(anchor.anchorKey) ??
          tCommission("anchors.unknownRequirement")
        );
      case "ATTACHMENT":
        return (
          attachmentLabelByUuid.get(anchor.anchorKey) ??
          tCommission("anchors.unknownAttachment")
        );
      default:
        return anchor.anchorKey;
    }
  }

  function openDrawer(
    anchor: AnchorDescriptor,
    defaultMode: "candidate" | "internal",
    options?: {
      draftAnnotation?: CommissionReviewCandidateAnnotation | null;
      internalNote?: CommissionReviewInternalNote | null;
    },
  ): void {
    setDrawerState({
      ...anchor,
      defaultMode,
      draftAnnotation:
        options?.draftAnnotation ??
        (defaultMode === "candidate"
          ? (draftAnnotationByAnchor.get(
              anchorKey(anchor.anchorType, anchor.anchorKey),
            ) ?? null)
          : null),
      internalNote: options?.internalNote ?? null,
    });
  }

  function renderInlineActions(
    anchor: AnchorDescriptor,
    options?: {
      allowCandidateFeedback?: boolean;
    },
  ): React.ReactNode {
    if (!canMutateInternalNotes && !canMutateCandidateFeedback) {
      return null;
    }

    const countKey = anchorKey(anchor.anchorType, anchor.anchorKey);
    const draftAnnotation = draftAnnotationByAnchor.get(countKey);
    const allowCandidateFeedback = options?.allowCandidateFeedback ?? true;

    return (
      <div className="flex shrink-0 items-center gap-2">
        {canMutateCandidateFeedback && allowCandidateFeedback && (
          <CommissionInlineAnnotationTrigger
            label={
              draftAnnotation
                ? tCommission("annotations.editCandidateButton")
                : tCommission("annotations.addCandidateButton")
            }
            count={candidateAnnotationCounts.get(countKey)}
            onClick={() => openDrawer(anchor, "candidate")}
          />
        )}
        {canMutateInternalNotes && (
          <CommissionInlineAnnotationTrigger
            label={tCommission("notes.addInline")}
            count={internalNoteCounts.get(countKey)}
            tone="internal"
            onClick={() => openDrawer(anchor, "internal")}
          />
        )}
      </div>
    );
  }

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

  return (
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
        <section className="min-w-0 space-y-5">
          <CommissionWorkspaceTabs
            tabs={tabs}
            activeTab={activeTab}
            basePath={`/${locale}/commission/${commissionUuid}/applications/${applicationUuid}`}
            ariaLabel={tCommission("detail.sectionNavLabel")}
          />

          {activeTab === "application" && (
            <LazyCommissionApplicationTab
              locale={locale}
              commissionUuid={commissionUuid}
              applicationUuid={applicationUuid}
              application={app}
              renderInlineActions={renderInlineActions}
            />
          )}

          {activeTab === "requirements" && (
            <LazyCommissionRequirementsTab
              locale={locale}
              commissionUuid={commissionUuid}
              applicationUuid={applicationUuid}
              application={app}
              renderInlineActions={renderInlineActions}
            />
          )}

          {activeTab === "candidateFeedback" && (
            <LazyCommissionCandidateFeedbackTab
              locale={locale}
              applicationUuid={applicationUuid}
              detail={detail}
              renderInlineActions={renderInlineActions}
              resolveAnchorLabel={resolveAnchorLabel}
              onEditDraft={(annotation) =>
                openDrawer(
                  {
                    anchorType: annotation.anchorType,
                    anchorKey: annotation.anchorKey,
                    label: resolveAnchorLabel(annotation),
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
          )}

          {activeTab === "internalNotes" && (
            <LazyCommissionCommentsClient
              notes={detail.internalNotes}
              currentUserUuid={detail.membership.userUuid}
              canCreate={canMutateInternalNotes}
              canEdit={canMutateInternalNotes}
              onCreateApplicationNote={() =>
                openDrawer(
                  {
                    anchorType: "APPLICATION",
                    anchorKey: applicationUuid,
                    label: tCommission("anchors.application"),
                  },
                  "internal",
                )
              }
              onEditNote={(note) =>
                openDrawer(
                  {
                    anchorType: note.anchorType,
                    anchorKey: note.anchorKey,
                    label: resolveAnchorLabel(note),
                  },
                  "internal",
                  {
                    internalNote: note,
                  },
                )
              }
              resolveAnchorLabel={(note) =>
                resolveAnchorLabel({
                  anchorType: note.anchorType,
                  anchorKey: note.anchorKey,
                  label: "",
                })
              }
            />
          )}

          {activeTab === "history" && (
            <LazyCommissionHistorySection
              locale={locale}
              commissionUuid={commissionUuid}
              applicationUuid={applicationUuid}
              timeline={detail.timeline}
              requirements={app.requirements}
              applicationUpdatedAt={app.updatedAt}
              lastSubmittedAt={app.lastSubmittedAt}
              activeRevisionRequest={activeRevisionRequest}
              resolveAnchorLabel={resolveAnchorLabel}
            />
          )}
        </section>

        {canManageWorkflow ? (
          <LazyCommissionWorkflowAside
            commissionUuid={commissionUuid}
            applicationUuid={applicationUuid}
            currentStatus={app.status}
            permissions={detail.permissions}
            availableTransitions={detail.availableTransitions}
            activeRevisionRequest={detail.activeRevisionRequest}
          />
        ) : null}
      </div>

      {drawerState && (
        <LazyCommissionAnnotationDrawer
          open
          onClose={() => setDrawerState(null)}
          commissionUuid={commissionUuid}
          applicationUuid={applicationUuid}
          anchor={{
            anchorType: drawerState.anchorType,
            anchorKey: drawerState.anchorKey,
            label: drawerState.label,
          }}
          canCreateInternal={canMutateInternalNotes}
          canCreateCandidate={canMutateCandidateFeedback}
          defaultMode={drawerState.defaultMode}
          draftAnnotation={drawerState.draftAnnotation ?? null}
          internalNote={drawerState.internalNote ?? null}
        />
      )}
    </main>
  );
}
