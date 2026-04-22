// @file: apps/web/src/components/commission-review/CommissionHistorySection.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { statusKey } from "@/lib/applications-i18n";
import { CommissionRevisionAuditPanel } from "@/components/commission-review/CommissionRevisionAuditPanel";
import type {
  CommissionReviewApplicationDetail,
  CommissionReviewCandidateAnnotation,
  CommissionReviewTimelineEvent,
  RequirementRowResponse,
} from "@hss/schemas";

type AnchorLabelReference = Pick<
  CommissionReviewCandidateAnnotation,
  "anchorType" | "anchorKey"
> & { label?: string | undefined };

type Props = {
  locale: string;
  commissionUuid: string;
  applicationUuid: string;
  timeline: CommissionReviewApplicationDetail["timeline"];
  requirements: RequirementRowResponse[];
  applicationUpdatedAt: string;
  lastSubmittedAt: string | null;
  activeRevisionRequest: CommissionReviewApplicationDetail["activeRevisionRequest"];
  resolveAnchorLabel: (reference: AnchorLabelReference) => string;
};

const TIMELINE_PAGE_SIZE = 5;

function formatDateTime(
  locale: string,
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale === "en" ? "en-GB" : "pl-PL");
}

export function CommissionHistorySection({
  locale,
  commissionUuid,
  applicationUuid,
  timeline,
  requirements,
  applicationUpdatedAt,
  lastSubmittedAt,
  activeRevisionRequest,
  resolveAnchorLabel,
}: Props) {
  const tCommission = useTranslations("commission");
  const tApplications = useTranslations("applications");
  const [historyPanels, setHistoryPanels] = useState({
    revisionAuditExpanded: false,
    timelineExpanded: false,
  });
  const historyRefreshKey = [
    applicationUpdatedAt,
    lastSubmittedAt ?? "",
    activeRevisionRequest?.uuid ?? "",
    activeRevisionRequest?.updatedAt ?? "",
    activeRevisionRequest?.status ?? "",
  ].join(":");
  const totalTimelinePages = Math.max(
    1,
    Math.ceil(timeline.length / TIMELINE_PAGE_SIZE),
  );
  const [timelineUiState, setTimelineUiState] = useState(() => ({
    refreshKey: historyRefreshKey,
    page: 1,
  }));
  const timelinePage =
    timelineUiState.refreshKey === historyRefreshKey ? timelineUiState.page : 1;
  const currentTimelinePage = Math.min(timelinePage, totalTimelinePages);
  const visibleTimelineEvents = useMemo(() => {
    const startIndex = (currentTimelinePage - 1) * TIMELINE_PAGE_SIZE;
    return timeline.slice(startIndex, startIndex + TIMELINE_PAGE_SIZE);
  }, [currentTimelinePage, timeline]);

  function renderTimelineSummary(event: CommissionReviewTimelineEvent): {
    title: string;
    body?: string | null;
    meta: string;
  } {
    if (event.kind === "STATUS_CHANGE") {
      const fromStatusKey = event.fromStatus ? statusKey(event.fromStatus) : null;
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

  return (
    <section className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {tCommission("timeline.title")}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground/75">
          {tCommission("timeline.description")}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <details
          className="rounded-2xl border border-border/70 bg-muted/15"
          onToggle={(event) => {
            const isExpanded = event.currentTarget.open;
            setHistoryPanels((previous) =>
              previous.revisionAuditExpanded === isExpanded
                ? previous
                : {
                    ...previous,
                    revisionAuditExpanded: isExpanded,
                  },
            );
          }}
        >
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

          {historyPanels.revisionAuditExpanded ? (
            <div className="border-t border-border/70 px-4 py-4">
              <CommissionRevisionAuditPanel
                key={historyRefreshKey}
                locale={locale}
                commissionUuid={commissionUuid}
                applicationUuid={applicationUuid}
                requirements={requirements}
                resolveAnchorLabel={resolveAnchorLabel}
              />
            </div>
          ) : null}
        </details>

        {timeline.length > 0 ? (
          <details
            className="rounded-2xl border border-border/70 bg-muted/15"
            onToggle={(event) => {
              const isExpanded = event.currentTarget.open;
              setHistoryPanels((previous) =>
                previous.timelineExpanded === isExpanded
                  ? previous
                  : {
                      ...previous,
                      timelineExpanded: isExpanded,
                    },
              );
            }}
          >
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
                    count: timeline.length,
                  })}
                </span>
              </div>
            </summary>

            {historyPanels.timelineExpanded ? (
              <div className="border-t border-border/70 px-4 py-4">
                <div className="space-y-4">
                  {visibleTimelineEvents.map((event) => {
                    const summary = renderTimelineSummary(event);

                    return (
                      <article
                        key={`${event.kind}:${event.uuid}`}
                        className="rounded-2xl border border-border/70 bg-background p-4"
                      >
                        <p className="text-sm font-semibold">{summary.title}</p>
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
                          disabled={currentTimelinePage === totalTimelinePages}
                          className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {tCommission("actions.nextPage")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </details>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/75">
            {tCommission("timeline.empty")}
          </p>
        )}
      </div>
    </section>
  );
}
