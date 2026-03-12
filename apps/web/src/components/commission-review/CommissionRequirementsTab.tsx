// @file: apps/web/src/components/commission-review/CommissionRequirementsTab.tsx
"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CommissionAttachmentDownloadLink } from "@/components/commission-review/CommissionAttachmentDownloadLink";
import type {
  CommissionReviewApplicationDetail,
  InstructorReviewAnchorType,
} from "@hss/schemas";

type InlineActionAnchor = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
};

type Props = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
  application: CommissionReviewApplicationDetail["application"];
  renderInlineActions: (
    anchor: InlineActionAnchor,
    options?: {
      allowCandidateFeedback?: boolean;
    },
  ) => React.ReactNode;
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

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground/75">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ValueCard({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
          {label}
        </p>
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

export function CommissionRequirementsTab({
  locale,
  commissionUuid,
  applicationUuid,
  application,
  renderInlineActions,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const groupedRequirements = useMemo(() => {
    const sortedRequirements = [...application.requirements]
      .filter((requirement) => !requirement.definition.isGroup)
      .sort(
        (left, right) => left.definition.sortOrder - right.definition.sortOrder,
      );

    const groups = [...(application.template.groupDefinitions ?? [])]
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
  }, [application.requirements, application.template.groupDefinitions, tCommission]);

  function renderAttachmentCard(
    attachment: NonNullable<
      CommissionReviewApplicationDetail["application"]["requirements"][number]["attachments"]
    >[number],
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

  return (
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
                <h3 className="text-base font-semibold">{group.title}</h3>
                <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                  {tCommission("workspace.requirements.groupCount", {
                    count: group.requirements.length,
                  })}
                </span>
              </div>

              <div className="grid gap-4">
                {group.requirements.map((requirement) => {
                  const requirementLabel = `${requirement.definition.code}. ${requirement.definition.description}`;

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
                            {tApplications(`requirementState.${requirement.state}`)}
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
                          label={tCommission("workspace.requirements.actionLabel")}
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
                          {tCommission("workspace.requirements.attachmentsLabel")}
                        </p>
                        {requirement.attachments && requirement.attachments.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {requirement.attachments.map((attachment) =>
                              renderAttachmentCard(attachment, requirementLabel),
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-foreground/75">
                            {tCommission("workspace.requirements.noAttachments")}
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
  );
}
