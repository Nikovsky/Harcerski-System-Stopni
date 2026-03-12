// @file: apps/web/src/components/commission-review/CommissionRevisionAuditPanel.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  degreeKey,
  fieldKey,
  presenceKey,
  scoutRankKey,
  supervisorFunctionKey,
} from "@/lib/applications-i18n";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import type {
  CommissionReviewCandidateAnnotation,
  CommissionReviewResolvedAnnotationChange,
  CommissionReviewResolvedChangeValue,
  CommissionReviewResolvedRevisionRequest,
  EditableInstructorApplicationField,
  RequirementRowResponse,
} from "@hss/schemas";

type Props = {
  locale: string;
  resolvedRevisionRequests: CommissionReviewResolvedRevisionRequest[];
  requirements: RequirementRowResponse[];
  resolveAnchorLabel: (
    reference: Pick<
      CommissionReviewCandidateAnnotation,
      "anchorType" | "anchorKey"
    > & { label?: string | undefined },
  ) => string;
};

const REVISION_REQUEST_PAGE_SIZE = 5;

function toPreview(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatDateTime(locale: string, value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale === "en" ? "en-GB" : "pl-PL");
}

export function CommissionRevisionAuditPanel({
  locale,
  resolvedRevisionRequests,
  requirements,
  resolveAnchorLabel,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const [page, setPage] = useState(1);
  const [selectedRevisionRequestUuid, setSelectedRevisionRequestUuid] = useState<
    string | null
  >(resolvedRevisionRequests[0]?.revisionRequest.uuid ?? null);

  const totalPages = Math.max(
    1,
    Math.ceil(resolvedRevisionRequests.length / REVISION_REQUEST_PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleRevisionRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * REVISION_REQUEST_PAGE_SIZE;
    return resolvedRevisionRequests.slice(
      startIndex,
      startIndex + REVISION_REQUEST_PAGE_SIZE,
    );
  }, [currentPage, resolvedRevisionRequests]);

  const selectedRevisionRequest =
    visibleRevisionRequests.find(
      (item) => item.revisionRequest.uuid === selectedRevisionRequestUuid,
    ) ??
    visibleRevisionRequests[0] ??
    null;

  if (resolvedRevisionRequests.length === 0) {
    return (
      <article className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/55">
        {tCommission("workspace.revisionAudit.empty")}
      </article>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
            {tCommission("workspace.revisionAudit.listTitle")}
          </p>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/60">
            {tCommission("workspace.revisionAudit.paginationLabel", {
              page: currentPage,
              total: totalPages,
            })}
          </span>
        </div>

        <div className="space-y-3">
          {visibleRevisionRequests.map((item) => {
            const isSelected =
              item.revisionRequest.uuid === selectedRevisionRequest?.revisionRequest.uuid;

            return (
              <button
                key={item.revisionRequest.uuid}
                type="button"
                onClick={() => setSelectedRevisionRequestUuid(item.revisionRequest.uuid)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/20"
                }`}
              >
                <p className="text-sm font-semibold">
                  {item.revisionRequest.summaryMessage ??
                    tCommission("workspace.revisionAudit.noSummary")}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-foreground/45">
                  {tCommission("workspace.revisionAudit.revisionsLabel", {
                    baseline: item.baselineSnapshotRevision ?? "—",
                    response: item.responseSnapshotRevision ?? "—",
                  })}
                </p>
                <p className="mt-2 text-sm text-foreground/65">
                  {formatDateTime(locale, item.revisionRequest.publishedAt)} {"->"}{" "}
                  {formatDateTime(locale, item.revisionRequest.resolvedAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge
                    className="border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                    label={tCommission("workspace.revisionAudit.counts.changed", {
                      count: item.changedCount,
                    })}
                  />
                  <StatusBadge
                    className="border-amber-500/35 bg-amber-500/10 text-amber-200"
                    label={tCommission("workspace.revisionAudit.counts.unchanged", {
                      count: item.unchangedCount,
                    })}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {tCommission("actions.previousPage")}
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((previous) => Math.min(totalPages, previous + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {tCommission("actions.nextPage")}
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
            {tCommission("workspace.revisionAudit.detailsTitle")}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {tCommission("workspace.revisionAudit.selectionHint")}
          </p>
        </div>

        {selectedRevisionRequest ? (
          <div className="rounded-2xl border border-border/70 bg-background">
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {selectedRevisionRequest.revisionRequest.summaryMessage ??
                      tCommission("workspace.revisionAudit.noSummary")}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-foreground/45">
                    {tCommission("workspace.revisionAudit.revisionsLabel", {
                      baseline:
                        selectedRevisionRequest.baselineSnapshotRevision ?? "—",
                      response:
                        selectedRevisionRequest.responseSnapshotRevision ?? "—",
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    className="border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                    label={tCommission("workspace.revisionAudit.counts.changed", {
                      count: selectedRevisionRequest.changedCount,
                    })}
                  />
                  <StatusBadge
                    className="border-amber-500/35 bg-amber-500/10 text-amber-200"
                    label={tCommission("workspace.revisionAudit.counts.unchanged", {
                      count: selectedRevisionRequest.unchangedCount,
                    })}
                  />
                  <StatusBadge
                    className="border-border bg-muted/30 text-foreground/65"
                    label={tCommission(
                      "workspace.revisionAudit.counts.notComparable",
                      {
                        count: selectedRevisionRequest.notComparableCount,
                      },
                    )}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <MetaCard
                  label={tCommission("workspace.revisionAudit.publishedAtLabel")}
                  value={formatDateTime(
                    locale,
                    selectedRevisionRequest.revisionRequest.publishedAt,
                  )}
                />
                <MetaCard
                  label={tCommission("workspace.revisionAudit.resolvedAtLabel")}
                  value={formatDateTime(
                    locale,
                    selectedRevisionRequest.revisionRequest.resolvedAt,
                  )}
                />
              </div>
            </div>

            <div className="border-t border-border/70 px-4 py-4">
              {!selectedRevisionRequest.auditAvailable ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-foreground/60">
                  {tCommission("workspace.revisionAudit.auditUnavailable")}
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedRevisionRequest.annotationAudits.map((audit) => {
                    const anchorLabel =
                      audit.anchorLabel ??
                      resolveAnchorLabel({
                        anchorType: audit.annotation.anchorType,
                        anchorKey: audit.annotation.anchorKey,
                      });

                    return (
                      <details
                        key={audit.annotation.uuid}
                        className="rounded-2xl border border-border/70 bg-muted/15"
                      >
                        <summary className="cursor-pointer list-none p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{anchorLabel}</p>
                              <p className="mt-2 text-sm leading-6 text-foreground/70">
                                {toPreview(audit.annotation.body)}
                              </p>
                            </div>
                            <StatusBadge
                              className={statusBadgeClassName(audit.comparisonStatus)}
                              label={tCommission(
                                `workspace.revisionAudit.status.${audit.comparisonStatus}`,
                              )}
                            />
                          </div>
                        </summary>

                        <div className="border-t border-border/70 px-4 py-4">
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80">
                            {audit.annotation.body}
                          </p>

                          {audit.changes.length > 0 ? (
                            <div className="mt-4 space-y-3">
                              {audit.changes.map((change) => (
                                <div
                                  key={`${audit.annotation.uuid}:${change.key}`}
                                  className="rounded-2xl border border-border/60 bg-background p-4"
                                >
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
                                    {resolveChangeLabel(
                                      change,
                                      audit.annotation,
                                      requirements,
                                      tCommission,
                                      tApplications,
                                    )}
                                  </p>
                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <AuditValueCard
                                      title={tCommission(
                                        "workspace.revisionAudit.beforeLabel",
                                      )}
                                      value={change.before}
                                      valueKey={change.key}
                                      locale={locale}
                                      tApplications={tApplications}
                                      tCommission={tCommission}
                                    />
                                    <AuditValueCard
                                      title={tCommission(
                                        "workspace.revisionAudit.afterLabel",
                                      )}
                                      value={change.after}
                                      valueKey={change.key}
                                      locale={locale}
                                      tApplications={tApplications}
                                      tCommission={tCommission}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/55">
            {tCommission("workspace.revisionAudit.empty")}
          </p>
        )}
      </section>
    </div>
  );
}

function resolveChangeLabel(
  change: CommissionReviewResolvedAnnotationChange,
  annotation: CommissionReviewCandidateAnnotation,
  requirements: RequirementRowResponse[],
  tCommission: ReturnType<typeof useTranslations>,
  tApplications: ReturnType<typeof useTranslations>,
): string {
  if (annotation.anchorType === "FIELD") {
    return (
      getFieldLabel(
        change.key as EditableInstructorApplicationField,
        tApplications,
        requirements,
      ) ?? change.key
    );
  }

  return tCommission(`workspace.revisionAudit.changeKeys.${change.key}`);
}

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {label}
    </span>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
        {label}
      </p>
      <p className="mt-2 text-sm text-foreground/80">{value}</p>
    </div>
  );
}

function AuditValueCard({
  title,
  value,
  valueKey,
  locale,
  tApplications,
  tCommission,
}: {
  title: string;
  value: CommissionReviewResolvedChangeValue | null;
  valueKey: string;
  locale: string;
  tApplications: ReturnType<typeof useTranslations>;
  tCommission: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
        {title}
      </p>
      <div className="mt-3 text-sm text-foreground/80">
        {renderAuditValue(value, valueKey, locale, tApplications, tCommission)}
      </div>
    </div>
  );
}

function renderAuditValue(
  value: CommissionReviewResolvedChangeValue | null,
  valueKey: string,
  locale: string,
  tApplications: ReturnType<typeof useTranslations>,
  tCommission: ReturnType<typeof useTranslations>,
) {
  if (!value) {
    return tCommission("workspace.revisionAudit.noValue");
  }

  if (value.kind === "TEXT") {
    return value.text || tCommission("workspace.revisionAudit.noValue");
  }

  if (value.kind === "DATE") {
    return value.date
      ? new Date(value.date).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL")
      : tCommission("workspace.revisionAudit.noValue");
  }

  if (value.kind === "ENUM") {
    return formatEnumValue(value.value, valueKey, tApplications) ??
      tCommission("workspace.revisionAudit.noValue");
  }

  if (value.items.length === 0) {
    return tCommission("workspace.revisionAudit.noValue");
  }

  return (
    <ul className="space-y-2">
      {value.items.map((item, index) => (
        <li key={item.uuid ?? `${item.originalFilename}:${index}`} className="break-words">
          <span className="font-medium">{item.originalFilename}</span>
          <span className="text-foreground/55">
            {" "}
            · {Math.max(1, Math.round(item.sizeBytes / 1024))} KB
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatEnumValue(
  value: string | null,
  valueKey: string,
  tApplications: ReturnType<typeof useTranslations>,
): string | null {
  if (!value) {
    return null;
  }

  if (valueKey === "state") {
    return tApplications(`requirementState.${value}`);
  }

  if (valueKey === "openTrialForRank") {
    const key = scoutRankKey(value);
    return key ? tApplications(key) : value;
  }

  if (valueKey === "hufcowyPresence") {
    const key = presenceKey(value);
    return key ? tApplications(key) : value;
  }

  if (valueKey === "supervisorInstructorRank") {
    const key = degreeKey(value);
    return key ? tApplications(key) : value;
  }

  if (valueKey === "supervisorInstructorFunction") {
    const key = supervisorFunctionKey(value);
    return key ? tApplications(key) : value;
  }

  const genericKey = fieldKey(value);
  return genericKey ? tApplications(genericKey) : value;
}

function statusBadgeClassName(status: string): string {
  switch (status) {
    case "CHANGED":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
    case "UNCHANGED":
      return "border-amber-500/35 bg-amber-500/10 text-amber-200";
    default:
      return "border-border bg-muted/30 text-foreground/65";
  }
}
