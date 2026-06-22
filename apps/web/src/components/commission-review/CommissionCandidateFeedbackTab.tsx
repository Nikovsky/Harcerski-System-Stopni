// @file: apps/web/src/components/commission-review/CommissionCandidateFeedbackTab.tsx
"use client";

import { useTranslations } from "next-intl";
import { IA_BUTTON_SECONDARY_SM } from "@/components/instructor-application/ui/button-classnames";
import type {
  CommissionReviewApplicationDetail,
  CommissionReviewCandidateAnnotation,
  InstructorReviewAnchorType,
} from "@hss/schemas";

type InlineActionAnchor = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  label: string;
};

type Props = {
  locale: string;
  applicationUuid: string;
  detail: CommissionReviewApplicationDetail;
  renderInlineActions: (
    anchor: InlineActionAnchor,
    options?: {
      allowCandidateFeedback?: boolean;
    },
  ) => React.ReactNode;
  resolveAnchorLabel: (
    reference: Pick<
      CommissionReviewCandidateAnnotation,
      "anchorType" | "anchorKey"
    > & { label?: string | undefined },
  ) => string;
  onEditDraft: (annotation: CommissionReviewCandidateAnnotation) => void;
  canMutateCandidateFeedback: boolean;
  canModerateCandidateFeedback: boolean;
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

function formatAuthor(author: CommissionReviewCandidateAnnotation["author"]): string {
  const fullName = [author.firstName, author.surname].filter(Boolean).join(" ").trim();
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

export function CommissionCandidateFeedbackTab({
  locale,
  applicationUuid,
  detail,
  renderInlineActions,
  resolveAnchorLabel,
  onEditDraft,
  canMutateCandidateFeedback,
  canModerateCandidateFeedback,
}: Props) {
  const tCommission = useTranslations("commission");
  const activeRevisionRequest = detail.activeRevisionRequest;
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

  return (
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
                  ? tCommission("workspace.candidateFeedback.draftPublishHint")
                  : tCommission("workspace.candidateFeedback.draftMemberHint")
                : tCommission("workspace.candidateFeedback.publishedHint")}
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-muted/15 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                  {tCommission("workspace.candidateFeedback.requestLabel")}
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {tCommission(`feedback.status.${activeRevisionRequest.status}`)}
                </h3>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                {tCommission("workspace.candidateFeedback.annotationCount", {
                  count: visibleAnnotations.length,
                })}
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
                    {tCommission("workspace.candidateFeedback.publishedAtLabel")}
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">
                    {formatDateTime(locale, activeRevisionRequest.publishedAt)}
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
                    {tCommission("workspace.candidateFeedback.lastActivityAtLabel")}
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
                        {tCommission("workspace.candidateFeedback.authorLabel", {
                          author: formatAuthor(annotation.author),
                        })}
                      </p>
                      <p className="mt-2 text-xs text-foreground/75">
                        {annotation.updatedAt !== annotation.createdAt
                          ? tCommission(
                              "workspace.candidateFeedback.updatedAtLabel",
                              {
                                date: formatDateTime(locale, annotation.updatedAt),
                              },
                            )
                          : tCommission(
                              "workspace.candidateFeedback.createdAtLabel",
                              {
                                date: formatDateTime(locale, annotation.createdAt),
                              },
                            )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">
                        {tCommission(`feedback.status.${annotation.status}`)}
                      </span>
                      {canMutateCandidateFeedback &&
                        annotation.status === "DRAFT" &&
                        (annotation.author.userUuid === detail.membership.userUuid ||
                          canModerateCandidateFeedback) && (
                          <button
                            type="button"
                            onClick={() => onEditDraft(annotation)}
                            className={IA_BUTTON_SECONDARY_SM}
                          >
                            {tCommission("workspace.candidateFeedback.editDraft")}
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
  );
}
