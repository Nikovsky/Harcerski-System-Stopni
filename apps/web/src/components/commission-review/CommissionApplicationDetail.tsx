// @file: apps/web/src/components/commission-review/CommissionApplicationDetail.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  degreeKey,
  presenceKey,
  scoutRankKey,
  statusKey,
  supervisorFunctionKey,
} from "@/lib/applications-i18n";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import { ApplicationStatusBadge } from "@/components/instructor-application/ui/ApplicationStatusBadge";
import { IA_BUTTON_SECONDARY_SM } from "@/components/instructor-application/ui/button-classnames";
import { CommissionAnnotationDrawer } from "@/components/commission-review/CommissionAnnotationDrawer";
import { CommissionAttachmentDownloadLink } from "@/components/commission-review/CommissionAttachmentDownloadLink";
import { CommissionCommentsClient } from "@/components/commission-review/CommissionCommentsClient";
import { CommissionInlineAnnotationTrigger } from "@/components/commission-review/CommissionInlineAnnotationTrigger";
import { CommissionRevisionAuditPanel } from "@/components/commission-review/CommissionRevisionAuditPanel";
import { CommissionStatusActions } from "@/components/commission-review/CommissionStatusActions";
import {
  CommissionWorkspaceTabs,
  type CommissionWorkspaceTabId,
} from "@/components/commission-review/CommissionWorkspaceTabs";
import type {
  AttachmentResponse,
  CommissionReviewApplicationDetail as CommissionReviewApplicationDetailResponse,
  CommissionReviewCandidateAnnotation,
  CommissionReviewInternalNote,
  CommissionReviewTimelineEvent,
  EditableInstructorApplicationField,
  InstructorReviewAnchorType,
} from "@hss/schemas";

type Props = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
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

const TAB_IDS: readonly CommissionWorkspaceTabId[] = [
  "application",
  "requirements",
  "candidateFeedback",
  "internalNotes",
  "history",
];

const TIMELINE_PAGE_SIZE = 5;

const APPLICATION_FIELDS: readonly EditableInstructorApplicationField[] = [
  "plannedFinishAt",
  "teamFunction",
  "hufiecFunction",
  "openTrialForRank",
  "openTrialDeadline",
  "hufcowyPresence",
];

const SERVICE_HISTORY_FIELDS: readonly EditableInstructorApplicationField[] = [
  "functionsHistory",
  "coursesHistory",
  "campsHistory",
  "successes",
  "failures",
];

const SUPERVISOR_FIELDS: readonly EditableInstructorApplicationField[] = [
  "supervisorFirstName",
  "supervisorSecondName",
  "supervisorSurname",
  "supervisorInstructorRank",
  "supervisorInstructorFunction",
];

function isTabId(value: string | null): value is CommissionWorkspaceTabId {
  return TAB_IDS.includes(value as CommissionWorkspaceTabId);
}

function formatDate(locale: string, value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    locale === "en" ? "en-GB" : "pl-PL",
  );
}

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

function formatAuthor(
  author:
    | CommissionReviewInternalNote["author"]
    | CommissionReviewCandidateAnnotation["author"],
): string {
  const fullName = [author.firstName, author.surname]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || author.email || author.userUuid;
}

function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground/75">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ValueCard({
  label,
  value,
  actions,
  multiline = false,
}: {
  label: string;
  value: string | null | undefined;
  actions?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
          {label}
        </p>
        {actions}
      </div>
      <p
        className={`mt-3 text-sm leading-6 text-foreground/85 ${
          multiline ? "whitespace-pre-wrap break-words" : "break-words"
        }`}
      >
        {value ?? "—"}
      </p>
    </article>
  );
}

export function CommissionApplicationDetail({
  locale,
  commissionUuid,
  applicationUuid,
  detail,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const searchParams = useSearchParams();
  const app = detail.application;
  const requestedTab = searchParams.get("tab");
  const activeTab: CommissionWorkspaceTabId = isTabId(requestedTab)
    ? requestedTab
    : "application";
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

  const groupedRequirements = useMemo(() => {
    const sortedRequirements = [...app.requirements]
      .filter((requirement) => !requirement.definition.isGroup)
      .sort(
        (left, right) => left.definition.sortOrder - right.definition.sortOrder,
      );
    const groups = [...(app.template.groupDefinitions ?? [])]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((definition) => ({
        id: definition.uuid,
        title: `${definition.code}. ${definition.description}`,
        requirements: sortedRequirements.filter(
          (requirement) => requirement.definition.parentId === definition.uuid,
        ),
      }))
      .filter((group) => group.requirements.length > 0);
    const groupedIds = new Set(groups.map((group) => group.id));
    const ungrouped = sortedRequirements.filter(
      (requirement) =>
        !requirement.definition.parentId ||
        !groupedIds.has(requirement.definition.parentId),
    );

    if (ungrouped.length > 0) {
      groups.push({
        id: "ungrouped",
        title: tCommission("workspace.requirements.ungroupedTitle"),
        requirements: ungrouped,
      });
    }

    return groups;
  }, [app.requirements, app.template.groupDefinitions, tCommission]);

  const totalTimelinePages = Math.max(
    1,
    Math.ceil(detail.timeline.length / TIMELINE_PAGE_SIZE),
  );

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
  const historyRefreshKey = [
    app.updatedAt,
    app.lastSubmittedAt ?? "",
    activeRevisionRequest?.uuid ?? "",
    activeRevisionRequest?.updatedAt ?? "",
    activeRevisionRequest?.status ?? "",
  ].join(":");
  const [timelineUiState, setTimelineUiState] = useState(() => ({
    refreshKey: historyRefreshKey,
    page: 1,
  }));
  const timelinePage =
    timelineUiState.refreshKey === historyRefreshKey ? timelineUiState.page : 1;
  const currentTimelinePage = Math.min(timelinePage, totalTimelinePages);
  const visibleTimelineEvents = useMemo(() => {
    const startIndex = (currentTimelinePage - 1) * TIMELINE_PAGE_SIZE;
    return detail.timeline.slice(startIndex, startIndex + TIMELINE_PAGE_SIZE);
  }, [currentTimelinePage, detail.timeline]);

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

  function renderTimelineSummary(event: CommissionReviewTimelineEvent): {
    title: string;
    body?: string | null;
    meta: string;
  } {
    if (event.kind === "STATUS_CHANGE") {
      const fromStatusKey = event.fromStatus
        ? statusKey(event.fromStatus)
        : null;
      const toStatusKey = statusKey(event.toStatus);
      return {
        title: tCommission("timeline.statusChangeTitle", {
          from: fromStatusKey
            ? tApplications(fromStatusKey)
            : tCommission("timeline.noPreviousStatus"),
          to: toStatusKey ? tApplications(toStatusKey) : event.toStatus,
        }),
        body: event.note,
        meta: `${event.actorDisplayName} · ${formatDateTime(locale, event.createdAt)}`,
      };
    }

    if (event.kind === "REVISION_REQUEST") {
      return {
        title: tCommission(`timeline.revisionRequest.${event.action}`),
        body: event.summaryMessage,
        meta: `${event.actorDisplayName} · ${formatDateTime(locale, event.createdAt)}`,
      };
    }

    return {
      title:
        event.action === "INSTRUCTOR_APPLICATION_SUBMITTED"
          ? tCommission("timeline.system.INSTRUCTOR_APPLICATION_SUBMITTED")
          : (event.summary ?? event.action),
      meta: `${event.actorDisplayName} · ${formatDateTime(locale, event.createdAt)}`,
    };
  }

  function renderAttachmentCard(
    attachment: AttachmentResponse,
    scopeLabel: string,
  ): React.ReactNode {
    return (
      <article
        key={attachment.uuid}
        className="rounded-2xl border border-border/70 bg-muted/15 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">
              {attachment.originalFilename}
            </p>
            <p className="mt-1 text-xs text-foreground/75">
              {tCommission("workspace.application.fileMeta", {
                sizeKb: Math.max(1, Math.round(attachment.sizeBytes / 1024)),
                uploadedAt: formatDateTime(locale, attachment.uploadedAt),
              })}
            </p>
          </div>
          <CommissionAttachmentDownloadLink
            commissionUuid={commissionUuid}
            applicationUuid={applicationUuid}
            attachment={attachment}
            showFilename={false}
            viewLabel={tCommission("actions.view")}
            downloadLabel={tCommission("actions.download")}
          />
        </div>
        <div className="mt-4">
          {renderInlineActions({
            anchorType: "ATTACHMENT",
            anchorKey: attachment.uuid,
            label: `${scopeLabel}: ${attachment.originalFilename}`,
          })}
        </div>
      </article>
    );
  }

  const hufcowyPresenceKey = app.hufcowyPresence
    ? presenceKey(app.hufcowyPresence)
    : null;
  const hufcowyAttachments = app.hufcowyPresenceAttachmentUuid
    ? app.attachments.filter(
        (attachment) => attachment.uuid === app.hufcowyPresenceAttachmentUuid,
      )
    : [];
  const generalAttachments = app.attachments.filter(
    (attachment) => attachment.uuid !== app.hufcowyPresenceAttachmentUuid,
  );
  const visibleAnnotations =
    activeRevisionRequest?.annotations.filter(
      (annotation) => annotation.status !== "CANCELLED",
    ) ?? [];
  const candidateFeedbackTitle =
    activeRevisionRequest?.status === "PUBLISHED"
      ? tCommission("workspace.candidateFeedback.publishedTitle")
      : tCommission("workspace.candidateFeedback.title");
  const candidateFeedbackDescription =
    activeRevisionRequest?.status === "PUBLISHED"
      ? tCommission("workspace.candidateFeedback.publishedDescription")
      : tCommission("workspace.candidateFeedback.description");
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
      badge: visibleAnnotations.length,
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
            ariaLabel={tCommission("detail.sectionNavLabel")}
          />

          {activeTab === "application" && (
            <div className="space-y-5">
              <SectionCard
                title={tCommission("workspace.application.candidateTitle")}
                description={tCommission(
                  "workspace.application.candidateDescription",
                )}
                actions={renderInlineActions(
                  {
                    anchorType: "APPLICATION",
                    anchorKey: applicationUuid,
                    label: tCommission("anchors.application"),
                  },
                  { allowCandidateFeedback: false },
                )}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ValueCard
                    label={tApplications("fields.profileFullName")}
                    value={
                      [
                        app.candidateProfile.firstName,
                        app.candidateProfile.surname,
                      ]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || null
                    }
                  />
                  <ValueCard
                    label={tApplications("fields.email")}
                    value={app.candidateProfile.email}
                  />
                  <ValueCard
                    label={tApplications("fields.phone")}
                    value={app.candidateProfile.phone}
                  />
                  <ValueCard
                    label={tApplications("fields.birthDate")}
                    value={formatDate(locale, app.candidateProfile.birthDate)}
                  />
                  <ValueCard
                    label={tApplications("fields.hufiecCode")}
                    value={
                      app.candidateProfile.hufiecName ??
                      app.candidateProfile.hufiecCode ??
                      null
                    }
                  />
                  <ValueCard
                    label={tApplications("fields.druzynaCode")}
                    value={
                      app.candidateProfile.druzynaName ??
                      app.candidateProfile.druzynaCode ??
                      null
                    }
                  />
                  <ValueCard
                    label={tApplications("fields.scoutRank")}
                    value={
                      app.candidateProfile.scoutRank
                        ? (() => {
                            const key = scoutRankKey(
                              app.candidateProfile.scoutRank,
                            );
                            return key
                              ? tApplications(key)
                              : app.candidateProfile.scoutRank;
                          })()
                        : null
                    }
                  />
                  <ValueCard
                    label={tApplications("fields.instructorRank")}
                    value={
                      app.candidateProfile.instructorRank
                        ? (() => {
                            const key = degreeKey(
                              app.candidateProfile.instructorRank,
                            );
                            return key
                              ? tApplications(key)
                              : app.candidateProfile.instructorRank;
                          })()
                        : null
                    }
                  />
                  <ValueCard
                    label={tCommission("workspace.application.profileReadonly")}
                    value={tCommission(
                      "workspace.application.profileReadonlyDescription",
                    )}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title={tApplications("sections.applicationData")}
                description={tCommission(
                  "workspace.application.applicationDescription",
                )}
                actions={renderInlineActions(
                  {
                    anchorType: "SECTION",
                    anchorKey: "BASIC_INFO",
                    label: tCommission("anchors.sections.BASIC_INFO"),
                  },
                  { allowCandidateFeedback: false },
                )}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {APPLICATION_FIELDS.map((field) => {
                    const label = getFieldLabel(
                      field,
                      tApplications,
                      app.requirements,
                    );
                    const value =
                      field === "plannedFinishAt"
                        ? formatDate(locale, app.plannedFinishAt)
                        : field === "openTrialDeadline"
                          ? formatDate(locale, app.openTrialDeadline)
                          : field === "openTrialForRank"
                            ? app.openTrialForRank
                              ? (() => {
                                  const key = scoutRankKey(
                                    app.openTrialForRank,
                                  );
                                  return key
                                    ? tApplications(key)
                                    : app.openTrialForRank;
                                })()
                              : null
                            : field === "hufcowyPresence"
                              ? app.hufcowyPresence
                                ? hufcowyPresenceKey
                                  ? tApplications(hufcowyPresenceKey)
                                  : app.hufcowyPresence
                                : null
                              : app[field];

                    return (
                      <ValueCard
                        key={field}
                        label={label}
                        value={
                          typeof value === "string" ? value : (value ?? null)
                        }
                        actions={renderInlineActions({
                          anchorType: "FIELD",
                          anchorKey: field,
                          label,
                        })}
                      />
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title={tApplications("steps.supervisor")}
                description={tCommission(
                  "workspace.application.supervisorDescription",
                )}
                actions={renderInlineActions(
                  {
                    anchorType: "SECTION",
                    anchorKey: "SUPERVISOR",
                    label: tCommission("anchors.sections.SUPERVISOR"),
                  },
                  { allowCandidateFeedback: false },
                )}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {SUPERVISOR_FIELDS.map((field) => {
                    const label = getFieldLabel(
                      field,
                      tApplications,
                      app.requirements,
                    );
                    const value =
                      field === "supervisorInstructorRank"
                        ? app.supervisorInstructorRank
                          ? (() => {
                              const key = degreeKey(
                                app.supervisorInstructorRank,
                              );
                              return key
                                ? tApplications(key)
                                : app.supervisorInstructorRank;
                            })()
                          : null
                        : field === "supervisorInstructorFunction"
                          ? app.supervisorInstructorFunction
                            ? (() => {
                                const key = supervisorFunctionKey(
                                  app.supervisorInstructorFunction,
                                );
                                return key
                                  ? tApplications(key)
                                  : app.supervisorInstructorFunction;
                              })()
                            : null
                          : app[field];

                    return (
                      <ValueCard
                        key={field}
                        label={label}
                        value={
                          typeof value === "string" ? value : (value ?? null)
                        }
                        actions={renderInlineActions({
                          anchorType: "FIELD",
                          anchorKey: field,
                          label,
                        })}
                      />
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title={tCommission("workspace.application.serviceTitle")}
                description={tCommission(
                  "workspace.application.serviceDescription",
                )}
                actions={renderInlineActions(
                  {
                    anchorType: "SECTION",
                    anchorKey: "SERVICE_HISTORY",
                    label: tCommission("anchors.sections.SERVICE_HISTORY"),
                  },
                  { allowCandidateFeedback: false },
                )}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  {SERVICE_HISTORY_FIELDS.map((field) => {
                    const label = getFieldLabel(
                      field,
                      tApplications,
                      app.requirements,
                    );

                    return (
                      <ValueCard
                        key={field}
                        label={label}
                        value={app[field]}
                        multiline
                        actions={renderInlineActions({
                          anchorType: "FIELD",
                          anchorKey: field,
                          label,
                        })}
                      />
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                title={tCommission("workspace.application.attachmentsTitle")}
                description={tCommission(
                  "workspace.application.attachmentsDescription",
                )}
                actions={renderInlineActions(
                  {
                    anchorType: "SECTION",
                    anchorKey: "GENERAL_ATTACHMENTS",
                    label: tCommission("anchors.sections.GENERAL_ATTACHMENTS"),
                  },
                  { allowCandidateFeedback: false },
                )}
              >
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/80">
                        {tApplications("sections.hufcowyWrittenOpinion")}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/75">
                        {tCommission(
                          "workspace.application.hufcowyDescription",
                        )}
                      </p>
                    </div>
                    {hufcowyAttachments.length > 0 ? (
                      <div className="space-y-3">
                        {hufcowyAttachments.map((attachment) =>
                          renderAttachmentCard(
                            attachment,
                            tApplications("sections.hufcowyWrittenOpinion"),
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-foreground/75">
                        {tCommission("workspace.application.hufcowyEmpty")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/80">
                        {tCommission("detail.generalAttachmentsTitle")}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/75">
                        {tCommission(
                          "workspace.application.generalAttachmentsDescription",
                        )}
                      </p>
                    </div>
                    {generalAttachments.length > 0 ? (
                      <div className="space-y-3">
                        {generalAttachments.map((attachment) =>
                          renderAttachmentCard(
                            attachment,
                            tCommission("detail.generalAttachmentsTitle"),
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-foreground/75">
                        {tCommission("detail.noGeneralAttachments")}
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === "requirements" && (
            <SectionCard
              title={tCommission("workspace.requirements.title")}
              description={tCommission("workspace.requirements.description")}
            >
              {groupedRequirements.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/75">
                  {tCommission("workspace.requirements.empty")}
                </p>
              ) : (
                <div className="space-y-6">
                  {groupedRequirements.map((group) => (
                    <section key={group.id} className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold">
                          {group.title}
                        </h3>
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                          {tCommission("workspace.requirements.groupCount", {
                            count: group.requirements.length,
                          })}
                        </span>
                      </div>

                      <div className="grid gap-4">
                        {group.requirements.map((requirement) => {
                          const requirementLabel =
                            requirementLabelByUuid.get(requirement.uuid) ??
                            `${requirement.definition.code}. ${requirement.definition.description}`;

                          return (
                            <article
                              key={requirement.uuid}
                              className="rounded-2xl border border-border/70 bg-muted/15 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold leading-6">
                                    {requirementLabel}
                                  </h4>
                                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-foreground/80">
                                    {tApplications(
                                      `requirementState.${requirement.state}`,
                                    )}
                                  </p>
                                </div>
                                {renderInlineActions({
                                  anchorType: "REQUIREMENT",
                                  anchorKey: requirement.uuid,
                                  label: requirementLabel,
                                })}
                              </div>

                              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                                <ValueCard
                                  label={tCommission(
                                    "workspace.requirements.actionLabel",
                                  )}
                                  value={requirement.actionDescription}
                                  multiline
                                />
                                <ValueCard
                                  label={tCommission(
                                    "workspace.requirements.verificationLabel",
                                  )}
                                  value={requirement.verificationText}
                                  multiline
                                />
                              </div>

                              <div className="mt-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                                  {tCommission(
                                    "workspace.requirements.attachmentsLabel",
                                  )}
                                </p>
                                {requirement.attachments &&
                                requirement.attachments.length > 0 ? (
                                  <div className="mt-3 space-y-3">
                                    {requirement.attachments.map((attachment) =>
                                      renderAttachmentCard(
                                        attachment,
                                        requirementLabel,
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-sm text-foreground/75">
                                    {tCommission(
                                      "workspace.requirements.noAttachments",
                                    )}
                                  </p>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === "candidateFeedback" && (
            <SectionCard
              title={candidateFeedbackTitle}
              description={candidateFeedbackDescription}
              actions={
                canMutateCandidateFeedback
                  ? renderInlineActions({
                      anchorType: "APPLICATION",
                      anchorKey: applicationUuid,
                      label: tCommission("anchors.application"),
                    })
                  : undefined
              }
            >
              {activeRevisionRequest ? (
                <div className="space-y-5">
                  <article className="rounded-2xl border border-border/70 bg-muted/15 p-5">
                    <p className="text-sm leading-6 text-foreground/75">
                      {activeRevisionRequest.status === "DRAFT"
                        ? detail.permissions.canPublishCandidateFeedback
                          ? tCommission(
                              "workspace.candidateFeedback.draftPublishHint",
                            )
                          : tCommission(
                              "workspace.candidateFeedback.draftMemberHint",
                            )
                        : tCommission(
                            "workspace.candidateFeedback.publishedHint",
                          )}
                    </p>
                  </article>

                  <article className="rounded-2xl border border-border/70 bg-muted/15 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                          {tCommission(
                            "workspace.candidateFeedback.requestLabel",
                          )}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold">
                          {tCommission(
                            `feedback.status.${activeRevisionRequest.status}`,
                          )}
                        </h3>
                      </div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                        {tCommission(
                          "workspace.candidateFeedback.annotationCount",
                          {
                            count: visibleAnnotations.length,
                          },
                        )}
                      </span>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
                      {activeRevisionRequest.summaryMessage ??
                        tCommission("workspace.candidateFeedback.noSummary")}
                    </p>
                    {activeRevisionRequest.status === "PUBLISHED" && (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                            {tCommission(
                              "workspace.candidateFeedback.publishedAtLabel",
                            )}
                          </p>
                          <p className="mt-2 text-sm text-foreground/80">
                            {formatDateTime(
                              locale,
                              activeRevisionRequest.publishedAt,
                            )}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                            {tCommission(
                              "workspace.candidateFeedback.firstViewedAtLabel",
                            )}
                          </p>
                          <p className="mt-2 text-sm text-foreground/80">
                            {formatDateTime(
                              locale,
                              activeRevisionRequest.candidateFirstViewedAt,
                            )}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                            {tCommission(
                              "workspace.candidateFeedback.lastActivityAtLabel",
                            )}
                          </p>
                          <p className="mt-2 text-sm text-foreground/80">
                            {formatDateTime(
                              locale,
                              activeRevisionRequest.candidateLastActivityAt,
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </article>

                  {visibleAnnotations.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/75">
                      {tCommission("workspace.candidateFeedback.empty")}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {visibleAnnotations.map((annotation) => (
                        <article
                          key={annotation.uuid}
                          className="rounded-2xl border border-border/70 bg-background p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                {resolveAnchorLabel(annotation)}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-foreground/80">
                                {tCommission(
                                  "workspace.candidateFeedback.authorLabel",
                                  {
                                    author: formatAuthor(annotation.author),
                                  },
                                )}
                              </p>
                              <p className="mt-2 text-xs text-foreground/75">
                                {annotation.updatedAt !== annotation.createdAt
                                  ? tCommission(
                                      "workspace.candidateFeedback.updatedAtLabel",
                                      {
                                        date: formatDateTime(
                                          locale,
                                          annotation.updatedAt,
                                        ),
                                      },
                                    )
                                  : tCommission(
                                      "workspace.candidateFeedback.createdAtLabel",
                                      {
                                        date: formatDateTime(
                                          locale,
                                          annotation.createdAt,
                                        ),
                                      },
                                    )}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                                {tCommission(
                                  `feedback.status.${annotation.status}`,
                                )}
                              </span>
                              {canMutateCandidateFeedback &&
                                annotation.status === "DRAFT" &&
                                (annotation.author.userUuid ===
                                  detail.membership.userUuid ||
                                  canModerateCandidateFeedback) && (
                                  <button
                                    type="button"
                                    onClick={() =>
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
                                    className={IA_BUTTON_SECONDARY_SM}
                                  >
                                    {tCommission(
                                      "workspace.candidateFeedback.editDraft",
                                    )}
                                  </button>
                                )}
                            </div>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
                            {annotation.body}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/75">
                  {tCommission("workspace.candidateFeedback.noActiveRequest")}
                </p>
              )}
            </SectionCard>
          )}

          {activeTab === "internalNotes" && (
            <CommissionCommentsClient
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
            <SectionCard
              title={tCommission("timeline.title")}
              description={tCommission("timeline.description")}
            >
              <div className="space-y-4">
                <details className="rounded-2xl border border-border/70 bg-muted/15">
                  <summary className="cursor-pointer list-none p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {tCommission("workspace.revisionAudit.title")}
                        </p>
                        <p className="mt-1 text-sm text-foreground/75">
                          {tCommission("workspace.revisionAudit.description")}
                        </p>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-border/70 px-4 py-4">
                    <CommissionRevisionAuditPanel
                      key={historyRefreshKey}
                      locale={locale}
                      commissionUuid={commissionUuid}
                      applicationUuid={applicationUuid}
                      requirements={app.requirements}
                      resolveAnchorLabel={resolveAnchorLabel}
                    />
                  </div>
                </details>
                {detail.timeline.length > 0 ? (
                  <details className="rounded-2xl border border-border/70 bg-muted/15">
                    <summary className="cursor-pointer list-none p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {tCommission("timeline.title")}
                          </p>
                          <p className="mt-1 text-sm text-foreground/75">
                            {tCommission("timeline.description")}
                          </p>
                        </div>
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                          {tCommission("timeline.count", {
                            count: detail.timeline.length,
                          })}
                        </span>
                      </div>
                    </summary>

                    <div className="border-t border-border/70 px-4 py-4">
                      <div className="space-y-4">
                        {visibleTimelineEvents.map((event) => {
                          const summary = renderTimelineSummary(event);

                          return (
                            <article
                              key={`${event.kind}:${event.uuid}`}
                              className="rounded-2xl border border-border/70 bg-background p-4"
                            >
                              <p className="text-sm font-semibold">
                                {summary.title}
                              </p>
                              {summary.body ? (
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
                                  {summary.body}
                                </p>
                              ) : null}
                              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-foreground/80">
                                {summary.meta}
                              </p>
                            </article>
                          );
                        })}

                        {totalTimelinePages > 1 ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                            <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                              {tCommission("timeline.paginationLabel", {
                                page: currentTimelinePage,
                                total: totalTimelinePages,
                              })}
                            </span>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setTimelineUiState({
                                    refreshKey: historyRefreshKey,
                                    page: Math.max(1, currentTimelinePage - 1),
                                  })
                                }
                                disabled={currentTimelinePage === 1}
                                className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {tCommission("actions.previousPage")}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setTimelineUiState({
                                    refreshKey: historyRefreshKey,
                                    page: Math.min(
                                      totalTimelinePages,
                                      currentTimelinePage + 1,
                                    ),
                                  })
                                }
                                disabled={
                                  currentTimelinePage === totalTimelinePages
                                }
                                className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                {tCommission("actions.nextPage")}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </details>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/75">
                    {tCommission("timeline.empty")}
                  </p>
                )}
              </div>
            </SectionCard>
          )}
        </section>

        {canManageWorkflow ? (
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <CommissionStatusActions
              commissionUuid={commissionUuid}
              applicationUuid={applicationUuid}
              currentStatus={app.status}
              permissions={detail.permissions}
              availableTransitions={detail.availableTransitions}
              activeRevisionRequest={detail.activeRevisionRequest}
            />
          </aside>
        ) : null}
      </div>

      {drawerState && (
        <CommissionAnnotationDrawer
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
