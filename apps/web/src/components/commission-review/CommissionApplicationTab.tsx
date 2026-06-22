// @file: apps/web/src/components/commission-review/CommissionApplicationTab.tsx

import { useTranslations } from "next-intl";
import {
  degreeKey,
  presenceKey,
  scoutRankKey,
  supervisorFunctionKey,
} from "@/lib/applications-i18n";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import { CommissionAttachmentDownloadLink } from "@/components/commission-review/CommissionAttachmentDownloadLink";
import { CommissionAnchorTriggerMarkup } from "@/components/commission-review/CommissionAnchorTriggerMarkup";
import type {
  CommissionReviewApplicationDetail,
  EditableInstructorApplicationField,
} from "@hss/schemas";

type Props = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
  application: CommissionReviewApplicationDetail["application"];
  canMutateCandidateFeedback: boolean;
  canMutateInternalNotes: boolean;
  anchorInteractionMeta: Record<
    string,
    {
      candidateCount: number;
      internalCount: number;
      hasCandidateDraft: boolean;
    }
  >;
};

export const APPLICATION_FIELDS: readonly EditableInstructorApplicationField[] = [
  "plannedFinishAt",
  "teamFunction",
  "hufiecFunction",
  "openTrialForRank",
  "openTrialDeadline",
  "hufcowyPresence",
];

export const SERVICE_HISTORY_FIELDS: readonly EditableInstructorApplicationField[] =
  ["functionsHistory", "coursesHistory", "campsHistory", "successes", "failures"];

export const SUPERVISOR_FIELDS: readonly EditableInstructorApplicationField[] = [
  "supervisorFirstName",
  "supervisorSecondName",
  "supervisorSurname",
  "supervisorInstructorRank",
  "supervisorInstructorFunction",
];

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

export function CommissionApplicationTab({
  locale,
  commissionUuid,
  applicationUuid,
  application,
  canMutateCandidateFeedback,
  canMutateInternalNotes,
  anchorInteractionMeta,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const hufcowyPresenceKey = application.hufcowyPresence
    ? presenceKey(application.hufcowyPresence)
    : null;
  const hufcowyAttachments = application.hufcowyPresenceAttachmentUuid
    ? application.attachments.filter(
        (attachment) =>
          attachment.uuid === application.hufcowyPresenceAttachmentUuid,
      )
    : [];
  const generalAttachments = application.attachments.filter(
    (attachment) => attachment.uuid !== application.hufcowyPresenceAttachmentUuid,
  );

  function getAnchorMeta(anchorType: string, anchorKey: string) {
    return (
      anchorInteractionMeta[`${anchorType}:${anchorKey}`] ?? {
        candidateCount: 0,
        internalCount: 0,
        hasCandidateDraft: false,
      }
    );
  }

  function renderAttachmentCard(
    attachment: CommissionReviewApplicationDetail["application"]["attachments"][number],
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
          <CommissionAnchorTriggerMarkup
            anchorType="ATTACHMENT"
            anchorKey={attachment.uuid}
            label={`${scopeLabel}: ${attachment.originalFilename}`}
            canMutateCandidateFeedback={canMutateCandidateFeedback}
            canMutateInternalNotes={canMutateInternalNotes}
            candidateCount={getAnchorMeta("ATTACHMENT", attachment.uuid).candidateCount}
            internalCount={getAnchorMeta("ATTACHMENT", attachment.uuid).internalCount}
            hasCandidateDraft={
              getAnchorMeta("ATTACHMENT", attachment.uuid).hasCandidateDraft
            }
          />
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title={tCommission("workspace.application.candidateTitle")}
        description={tCommission("workspace.application.candidateDescription")}
        actions={
          <CommissionAnchorTriggerMarkup
            anchorType="APPLICATION"
            anchorKey={applicationUuid}
            label={tCommission("anchors.application")}
            allowCandidateFeedback={false}
            canMutateCandidateFeedback={canMutateCandidateFeedback}
            canMutateInternalNotes={canMutateInternalNotes}
            candidateCount={getAnchorMeta("APPLICATION", applicationUuid).candidateCount}
            internalCount={getAnchorMeta("APPLICATION", applicationUuid).internalCount}
            hasCandidateDraft={
              getAnchorMeta("APPLICATION", applicationUuid).hasCandidateDraft
            }
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ValueCard
            label={tApplications("fields.profileFullName")}
            value={
              [application.candidateProfile.firstName, application.candidateProfile.surname]
                .filter(Boolean)
                .join(" ")
                .trim() || null
            }
          />
          <ValueCard
            label={tApplications("fields.email")}
            value={application.candidateProfile.email}
          />
          <ValueCard
            label={tApplications("fields.phone")}
            value={application.candidateProfile.phone}
          />
          <ValueCard
            label={tApplications("fields.birthDate")}
            value={formatDate(locale, application.candidateProfile.birthDate)}
          />
          <ValueCard
            label={tApplications("fields.hufiecCode")}
            value={
              application.candidateProfile.hufiecName ??
              application.candidateProfile.hufiecCode ??
              null
            }
          />
          <ValueCard
            label={tApplications("fields.druzynaCode")}
            value={
              application.candidateProfile.druzynaName ??
              application.candidateProfile.druzynaCode ??
              null
            }
          />
          <ValueCard
            label={tApplications("fields.scoutRank")}
            value={
              application.candidateProfile.scoutRank
                ? (() => {
                    const key = scoutRankKey(application.candidateProfile.scoutRank);
                    return key ? tApplications(key) : application.candidateProfile.scoutRank;
                  })()
                : null
            }
          />
          <ValueCard
            label={tApplications("fields.instructorRank")}
            value={
              application.candidateProfile.instructorRank
                ? (() => {
                    const key = degreeKey(application.candidateProfile.instructorRank);
                    return key ? tApplications(key) : application.candidateProfile.instructorRank;
                  })()
                : null
            }
          />
          <ValueCard
            label={tCommission("workspace.application.profileReadonly")}
            value={tCommission("workspace.application.profileReadonlyDescription")}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={tApplications("sections.applicationData")}
        description={tCommission("workspace.application.applicationDescription")}
        actions={
          <CommissionAnchorTriggerMarkup
            anchorType="SECTION"
            anchorKey="BASIC_INFO"
            label={tCommission("anchors.sections.BASIC_INFO")}
            allowCandidateFeedback={false}
            canMutateCandidateFeedback={canMutateCandidateFeedback}
            canMutateInternalNotes={canMutateInternalNotes}
            candidateCount={getAnchorMeta("SECTION", "BASIC_INFO").candidateCount}
            internalCount={getAnchorMeta("SECTION", "BASIC_INFO").internalCount}
            hasCandidateDraft={getAnchorMeta("SECTION", "BASIC_INFO").hasCandidateDraft}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {APPLICATION_FIELDS.map((field) => {
            const label = getFieldLabel(
              field,
              tApplications,
              application.requirements,
            );
            const value =
              field === "plannedFinishAt"
                ? formatDate(locale, application.plannedFinishAt)
                : field === "openTrialDeadline"
                  ? formatDate(locale, application.openTrialDeadline)
                  : field === "openTrialForRank"
                    ? application.openTrialForRank
                      ? (() => {
                          const key = scoutRankKey(application.openTrialForRank);
                          return key ? tApplications(key) : application.openTrialForRank;
                        })()
                      : null
                    : field === "hufcowyPresence"
                      ? application.hufcowyPresence
                        ? hufcowyPresenceKey
                          ? tApplications(hufcowyPresenceKey)
                          : application.hufcowyPresence
                        : null
                      : application[field];

            return (
              <ValueCard
                key={field}
                label={label}
                value={typeof value === "string" ? value : (value ?? null)}
                actions={
                  <CommissionAnchorTriggerMarkup
                    anchorType="FIELD"
                    anchorKey={field}
                    label={label}
                    canMutateCandidateFeedback={canMutateCandidateFeedback}
                    canMutateInternalNotes={canMutateInternalNotes}
                    candidateCount={getAnchorMeta("FIELD", field).candidateCount}
                    internalCount={getAnchorMeta("FIELD", field).internalCount}
                    hasCandidateDraft={getAnchorMeta("FIELD", field).hasCandidateDraft}
                  />
                }
              />
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={tApplications("steps.supervisor")}
        description={tCommission("workspace.application.supervisorDescription")}
        actions={
          <CommissionAnchorTriggerMarkup
            anchorType="SECTION"
            anchorKey="SUPERVISOR"
            label={tCommission("anchors.sections.SUPERVISOR")}
            allowCandidateFeedback={false}
            canMutateCandidateFeedback={canMutateCandidateFeedback}
            canMutateInternalNotes={canMutateInternalNotes}
            candidateCount={getAnchorMeta("SECTION", "SUPERVISOR").candidateCount}
            internalCount={getAnchorMeta("SECTION", "SUPERVISOR").internalCount}
            hasCandidateDraft={getAnchorMeta("SECTION", "SUPERVISOR").hasCandidateDraft}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SUPERVISOR_FIELDS.map((field) => {
            const label = getFieldLabel(
              field,
              tApplications,
              application.requirements,
            );
            const value =
              field === "supervisorInstructorRank"
                ? application.supervisorInstructorRank
                  ? (() => {
                      const key = degreeKey(application.supervisorInstructorRank);
                      return key ? tApplications(key) : application.supervisorInstructorRank;
                    })()
                  : null
                : field === "supervisorInstructorFunction"
                  ? application.supervisorInstructorFunction
                    ? (() => {
                        const key = supervisorFunctionKey(
                          application.supervisorInstructorFunction,
                        );
                        return key
                          ? tApplications(key)
                          : application.supervisorInstructorFunction;
                      })()
                    : null
                  : application[field];

            return (
              <ValueCard
                key={field}
                label={label}
                value={typeof value === "string" ? value : (value ?? null)}
                actions={
                  <CommissionAnchorTriggerMarkup
                    anchorType="FIELD"
                    anchorKey={field}
                    label={label}
                    canMutateCandidateFeedback={canMutateCandidateFeedback}
                    canMutateInternalNotes={canMutateInternalNotes}
                    candidateCount={getAnchorMeta("FIELD", field).candidateCount}
                    internalCount={getAnchorMeta("FIELD", field).internalCount}
                    hasCandidateDraft={getAnchorMeta("FIELD", field).hasCandidateDraft}
                  />
                }
              />
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={tCommission("workspace.application.serviceTitle")}
        description={tCommission("workspace.application.serviceDescription")}
        actions={
          <CommissionAnchorTriggerMarkup
            anchorType="SECTION"
            anchorKey="SERVICE_HISTORY"
            label={tCommission("anchors.sections.SERVICE_HISTORY")}
            allowCandidateFeedback={false}
            canMutateCandidateFeedback={canMutateCandidateFeedback}
            canMutateInternalNotes={canMutateInternalNotes}
            candidateCount={getAnchorMeta("SECTION", "SERVICE_HISTORY").candidateCount}
            internalCount={getAnchorMeta("SECTION", "SERVICE_HISTORY").internalCount}
            hasCandidateDraft={
              getAnchorMeta("SECTION", "SERVICE_HISTORY").hasCandidateDraft
            }
          />
        }
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {SERVICE_HISTORY_FIELDS.map((field) => {
            const label = getFieldLabel(
              field,
              tApplications,
              application.requirements,
            );

            return (
              <ValueCard
                key={field}
                label={label}
                value={application[field]}
                multiline
                actions={
                  <CommissionAnchorTriggerMarkup
                    anchorType="FIELD"
                    anchorKey={field}
                    label={label}
                    canMutateCandidateFeedback={canMutateCandidateFeedback}
                    canMutateInternalNotes={canMutateInternalNotes}
                    candidateCount={getAnchorMeta("FIELD", field).candidateCount}
                    internalCount={getAnchorMeta("FIELD", field).internalCount}
                    hasCandidateDraft={getAnchorMeta("FIELD", field).hasCandidateDraft}
                  />
                }
              />
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={tCommission("workspace.application.attachmentsTitle")}
        description={tCommission("workspace.application.attachmentsDescription")}
        actions={
          <CommissionAnchorTriggerMarkup
            anchorType="SECTION"
            anchorKey="GENERAL_ATTACHMENTS"
            label={tCommission("anchors.sections.GENERAL_ATTACHMENTS")}
            allowCandidateFeedback={false}
            canMutateCandidateFeedback={canMutateCandidateFeedback}
            canMutateInternalNotes={canMutateInternalNotes}
            candidateCount={
              getAnchorMeta("SECTION", "GENERAL_ATTACHMENTS").candidateCount
            }
            internalCount={
              getAnchorMeta("SECTION", "GENERAL_ATTACHMENTS").internalCount
            }
            hasCandidateDraft={
              getAnchorMeta("SECTION", "GENERAL_ATTACHMENTS").hasCandidateDraft
            }
          />
        }
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/80">
                {tApplications("sections.hufcowyWrittenOpinion")}
              </h3>
              <p className="mt-1 text-sm text-foreground/75">
                {tCommission("workspace.application.hufcowyDescription")}
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
                {tCommission("workspace.application.generalAttachmentsDescription")}
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
  );
}
