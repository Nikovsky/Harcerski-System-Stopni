// @file: apps/web/src/components/commission-review/CommissionRevisionAuditPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  degreeKey,
  fieldKey,
  presenceKey,
  scoutRankKey,
  supervisorFunctionKey,
} from "@/lib/applications-i18n";
import { ApiError, apiFetch } from "@/lib/api";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import type {
  CommissionReviewCandidateAnnotation,
  CommissionReviewResolvedAnnotationChange,
  CommissionReviewResolvedChangeValue,
  CommissionReviewResolvedRevisionRequestDetailResponse,
  CommissionReviewResolvedRevisionRequestListResponse,
} from "@hss/schemas/commission-review";
import type {
  EditableInstructorApplicationField,
  RequirementRowResponse,
} from "@hss/schemas/instructor-application";

type Props = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
  requirements: RequirementRowResponse[];
  resolveAnchorLabel: (
    reference: Pick<
      CommissionReviewCandidateAnnotation,
      "anchorType" | "anchorKey"
    > & { label?: string | undefined },
  ) => string;
};

type RevisionAuditListState = {
  requestKey: string;
  response: CommissionReviewResolvedRevisionRequestListResponse | null;
  error: string | null;
};

type RevisionAuditDetailState = {
  requestKey: string;
  response: CommissionReviewResolvedRevisionRequestDetailResponse | null;
  error: string | null;
};

const REVISION_REQUEST_PAGE_SIZE = 5;

function toPreview(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }

  return fallback;
}

function buildRevisionAuditListPath(
  commissionUuid: string,
  applicationUuid: string,
  page: number,
): string {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(REVISION_REQUEST_PAGE_SIZE),
  });

  return `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/revision-request-audits?${query.toString()}`;
}

function buildRevisionAuditDetailPath(
  commissionUuid: string,
  applicationUuid: string,
  revisionRequestUuid: string,
): string {
  return `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/revision-request-audits/${encodeURIComponent(revisionRequestUuid)}`;
}

export function CommissionRevisionAuditPanel({
  locale,
  commissionUuid,
  applicationUuid,
  requirements,
  resolveAnchorLabel,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const [page, setPage] = useState(1);
  const [selectedRevisionRequestUuid, setSelectedRevisionRequestUuid] =
    useState<string | null>(null);
  const [listReloadKey, setListReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [listState, setListState] = useState<RevisionAuditListState>(() => ({
    requestKey: "",
    response: null,
    error: null,
  }));
  const [detailState, setDetailState] = useState<RevisionAuditDetailState>(
    () => ({
      requestKey: "",
      response: null,
      error: null,
    }),
  );
  const listRequestKey = [
    commissionUuid,
    applicationUuid,
    String(page),
    String(listReloadKey),
  ].join(":");
  const listResponse =
    listState.requestKey === listRequestKey ? listState.response : null;
  const listError =
    listState.requestKey === listRequestKey ? listState.error : null;
  const isListLoading = listState.requestKey !== listRequestKey;

  useEffect(() => {
    let isActive = true;

    void apiFetch<CommissionReviewResolvedRevisionRequestListResponse>(
      buildRevisionAuditListPath(commissionUuid, applicationUuid, page),
    )
      .then((response) => {
        if (!isActive) {
          return;
        }

        const totalPages = Math.max(
          1,
          Math.ceil(
            response.total / (response.pageSize ?? REVISION_REQUEST_PAGE_SIZE),
          ),
        );

        if (page > totalPages) {
          setPage(totalPages);
          return;
        }

        setListState({
          requestKey: listRequestKey,
          response,
          error: null,
        });
        setSelectedRevisionRequestUuid((currentSelection) => {
          if (
            currentSelection &&
            response.items.some(
              (item) => item.revisionRequest.uuid === currentSelection,
            )
          ) {
            return currentSelection;
          }

          return response.items[0]?.revisionRequest.uuid ?? null;
        });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setListState({
          requestKey: listRequestKey,
          response: null,
          error: toErrorMessage(
            error,
            tCommission("workspace.revisionAudit.listLoadError"),
          ),
        });
        setSelectedRevisionRequestUuid(null);
      });

    return () => {
      isActive = false;
    };
  }, [applicationUuid, commissionUuid, listRequestKey, page, tCommission]);

  const detailRequestKey = selectedRevisionRequestUuid
    ? [
        commissionUuid,
        applicationUuid,
        selectedRevisionRequestUuid,
        String(detailReloadKey),
      ].join(":")
    : null;
  const detailResponse =
    detailRequestKey && detailState.requestKey === detailRequestKey
      ? detailState.response
      : null;
  const detailError =
    detailRequestKey && detailState.requestKey === detailRequestKey
      ? detailState.error
      : null;
  const isDetailLoading =
    detailRequestKey !== null && detailState.requestKey !== detailRequestKey;

  useEffect(() => {
    if (!selectedRevisionRequestUuid || !detailRequestKey) {
      return;
    }

    let isActive = true;

    void apiFetch<CommissionReviewResolvedRevisionRequestDetailResponse>(
      buildRevisionAuditDetailPath(
        commissionUuid,
        applicationUuid,
        selectedRevisionRequestUuid,
      ),
    )
      .then((response) => {
        if (!isActive) {
          return;
        }

        setDetailState({
          requestKey: detailRequestKey,
          response,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setDetailState({
          requestKey: detailRequestKey,
          response: null,
          error: toErrorMessage(
            error,
            tCommission("workspace.revisionAudit.detailsLoadError"),
          ),
        });
      });

    return () => {
      isActive = false;
    };
  }, [
    applicationUuid,
    commissionUuid,
    detailRequestKey,
    selectedRevisionRequestUuid,
    tCommission,
  ]);

  const totalItems = listResponse?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(
      totalItems / (listResponse?.pageSize ?? REVISION_REQUEST_PAGE_SIZE),
    ),
  );
  const currentPage = Math.min(page, totalPages);

  function handlePreviousPage(): void {
    setPage((previous) => Math.max(1, previous - 1));
    setSelectedRevisionRequestUuid(null);
  }

  function handleNextPage(): void {
    setPage((previous) => Math.min(totalPages, previous + 1));
    setSelectedRevisionRequestUuid(null);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <section className="space-y-4" aria-busy={isListLoading}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
            {tCommission("workspace.revisionAudit.listTitle")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/60">
              {tCommission("workspace.revisionAudit.count", {
                count: totalItems,
              })}
            </span>
            {totalItems > 0 ? (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground/60">
                {tCommission("workspace.revisionAudit.paginationLabel", {
                  page: currentPage,
                  total: totalPages,
                })}
              </span>
            ) : null}
          </div>
        </div>

        {isListLoading && !listResponse ? (
          <article className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/60">
            {tCommission("workspace.revisionAudit.loadingList")}
          </article>
        ) : listError ? (
          <article className="space-y-4 rounded-2xl border border-dashed border-border px-4 py-6">
            <p className="text-sm text-foreground/70">{listError}</p>
            <button
              type="button"
              onClick={() => setListReloadKey((value) => value + 1)}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground/75 transition hover:border-primary/40 hover:text-primary"
            >
              {tCommission("workspace.revisionAudit.retry")}
            </button>
          </article>
        ) : totalItems === 0 || !listResponse ? (
          <article className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/55">
            {tCommission("workspace.revisionAudit.empty")}
          </article>
        ) : (
          <>
            <div className="space-y-3">
              {listResponse.items.map((item) => {
                const isSelected =
                  item.revisionRequest.uuid === selectedRevisionRequestUuid;

                return (
                  <button
                    key={item.revisionRequest.uuid}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedRevisionRequestUuid(item.revisionRequest.uuid)
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
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
                      {formatDateTime(locale, item.revisionRequest.publishedAt)}{" "}
                      {"->"}{" "}
                      {formatDateTime(locale, item.revisionRequest.resolvedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge
                        className={
                          item.auditAvailable
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-amber-300 bg-amber-50 text-amber-950"
                        }
                        label={tCommission(
                          item.auditAvailable
                            ? "workspace.revisionAudit.auditAvailableLabel"
                            : "workspace.revisionAudit.auditUnavailableLabel",
                        )}
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
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {tCommission("actions.previousPage")}
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {tCommission("actions.nextPage")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-4" aria-busy={isDetailLoading}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
            {tCommission("workspace.revisionAudit.detailsTitle")}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {tCommission("workspace.revisionAudit.selectionHint")}
          </p>
        </div>

        {isListLoading && !listResponse ? (
          <article className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/60">
            {tCommission("workspace.revisionAudit.loadingDetails")}
          </article>
        ) : isDetailLoading ? (
          <article className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/60">
            {tCommission("workspace.revisionAudit.loadingDetails")}
          </article>
        ) : detailError ? (
          <article className="space-y-4 rounded-2xl border border-dashed border-border px-4 py-6">
            <p className="text-sm text-foreground/70">{detailError}</p>
            <button
              type="button"
              onClick={() => setDetailReloadKey((value) => value + 1)}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground/75 transition hover:border-primary/40 hover:text-primary"
            >
              {tCommission("workspace.revisionAudit.retry")}
            </button>
          </article>
        ) : detailResponse ? (
          <div className="rounded-2xl border border-border/70 bg-background">
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {detailResponse.revisionRequest.summaryMessage ??
                      tCommission("workspace.revisionAudit.noSummary")}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-foreground/45">
                    {tCommission("workspace.revisionAudit.revisionsLabel", {
                      baseline: detailResponse.baselineSnapshotRevision ?? "—",
                      response: detailResponse.responseSnapshotRevision ?? "—",
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    className="border-emerald-300 bg-emerald-50 text-emerald-900"
                    label={tCommission(
                      "workspace.revisionAudit.counts.changed",
                      {
                        count: detailResponse.changedCount,
                      },
                    )}
                  />
                  <StatusBadge
                    className="border-amber-300 bg-amber-50 text-amber-950"
                    label={tCommission(
                      "workspace.revisionAudit.counts.unchanged",
                      {
                        count: detailResponse.unchangedCount,
                      },
                    )}
                  />
                  <StatusBadge
                    className="border-slate-300 bg-slate-50 text-slate-900"
                    label={tCommission(
                      "workspace.revisionAudit.counts.notComparable",
                      {
                        count: detailResponse.notComparableCount,
                      },
                    )}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <MetaCard
                  label={tCommission(
                    "workspace.revisionAudit.publishedAtLabel",
                  )}
                  value={formatDateTime(
                    locale,
                    detailResponse.revisionRequest.publishedAt,
                  )}
                />
                <MetaCard
                  label={tCommission("workspace.revisionAudit.resolvedAtLabel")}
                  value={formatDateTime(
                    locale,
                    detailResponse.revisionRequest.resolvedAt,
                  )}
                />
              </div>
            </div>

            <div className="border-t border-border/70 px-4 py-4">
              {!detailResponse.auditAvailable ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-foreground/60">
                  {tCommission("workspace.revisionAudit.auditUnavailable")}
                </p>
              ) : (
                <div className="space-y-4">
                  {detailResponse.annotationAudits.map((audit) => {
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
                              <p className="text-sm font-semibold">
                                {anchorLabel}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-foreground/70">
                                {toPreview(audit.annotation.body)}
                              </p>
                            </div>
                            <StatusBadge
                              className={statusBadgeClassName(
                                audit.comparisonStatus,
                              )}
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
      ? new Date(value.date).toLocaleDateString(
          locale === "en" ? "en-GB" : "pl-PL",
        )
      : tCommission("workspace.revisionAudit.noValue");
  }

  if (value.kind === "ENUM") {
    return (
      formatEnumValue(value.value, valueKey, tApplications) ??
      tCommission("workspace.revisionAudit.noValue")
    );
  }

  if (value.items.length === 0) {
    return tCommission("workspace.revisionAudit.noValue");
  }

  return (
    <ul className="space-y-2">
      {value.items.map((item, index) => (
        <li
          key={item.uuid ?? `${item.originalFilename}:${index}`}
          className="break-words"
        >
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
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "UNCHANGED":
      return "border-amber-300 bg-amber-50 text-amber-950";
    default:
      return "border-slate-300 bg-slate-50 text-slate-900";
  }
}
