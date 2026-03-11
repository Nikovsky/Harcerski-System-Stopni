// @file: apps/web/src/components/commission-review/CommissionApplicationInbox.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { degreeKey, statusKey } from "@/lib/applications-i18n";
import { ApplicationStatusBadge } from "@/components/instructor-application/ui/ApplicationStatusBadge";
import {
  IA_BUTTON_PRIMARY_SM,
  IA_BUTTON_SECONDARY_SM,
} from "@/components/instructor-application/ui/button-classnames";
import type {
  ApplicationStatus,
  CommissionReviewApplicationListQuery,
  CommissionReviewApplicationListResponse,
  CommissionReviewMembership,
} from "@hss/schemas";

type Props = {
  locale: string;
  commissionUuid: string;
  membership: CommissionReviewMembership;
  query: CommissionReviewApplicationListQuery;
  response: CommissionReviewApplicationListResponse;
};

const STATUS_FILTERS: ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "TO_FIX",
  "APPROVED",
  "IN_PROGRESS",
  "REPORT_SUBMITTED",
  "COMPLETED_POSITIVE",
  "REJECTED",
  "ARCHIVED",
];

function formatDate(locale: string, value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "pl-PL");
}

function buildInboxQueryString(
  query: CommissionReviewApplicationListQuery,
  overrides: Partial<CommissionReviewApplicationListQuery> = {},
): string {
  const nextQuery = {
    ...query,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (nextQuery.q) {
    params.set("q", nextQuery.q);
  }

  for (const status of nextQuery.status) {
    params.append("status", status);
  }

  params.set("page", String(nextQuery.page));
  params.set("pageSize", String(nextQuery.pageSize));
  params.set("sort", nextQuery.sort);
  params.set("direction", nextQuery.direction);

  return params.toString();
}

function getCandidateLabel(
  item: CommissionReviewApplicationListResponse["items"][number],
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  const fullName = [item.candidateFirstName, item.candidateSurname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || item.candidateEmail || t("inbox.unknownCandidate");
}

export async function CommissionApplicationInbox({
  locale,
  commissionUuid,
  membership,
  query,
  response,
}: Props) {
  const tCommission = await getTranslations("commission");
  const tApplications = await getTranslations("applications");
  const openFixCount = response.items.filter((item) => item.hasOpenFixRequest).length;
  const nextPageQuery = buildInboxQueryString(query, { page: query.page + 1 });
  const prevPageQuery = buildInboxQueryString(query, {
    page: Math.max(1, query.page - 1),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(320px,0.9fr)]">
        <section className="space-y-6">
          <header className="rounded-3xl border border-border bg-gradient-to-br from-background via-background to-muted/50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">
                  {membership.commissionType
                    ? tCommission(`types.${membership.commissionType}`)
                    : tCommission("types.UNKNOWN")}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  {membership.commissionName ?? tCommission("membership.fallbackNameShort")}
                </h1>
                <p className="mt-2 text-sm text-foreground/60">
                  {tCommission("membership.roleLabel")}:{" "}
                  <span className="font-medium text-foreground">
                    {tCommission(`roles.${membership.commissionRole}`)}
                  </span>
                </p>
              </div>
              <Link
                href={`/${locale}/commission`}
                className="rounded-full border border-border px-4 py-2 text-sm text-foreground/70 hover:bg-muted"
              >
                {tCommission("membership.switchCommission")}
              </Link>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-border bg-background p-5">
              <p className="text-sm text-foreground/55">{tCommission("inbox.stats.total")}</p>
              <p className="mt-2 text-3xl font-semibold">{response.total}</p>
            </article>
            <article className="rounded-3xl border border-border bg-background p-5">
              <p className="text-sm text-foreground/55">{tCommission("inbox.stats.onPage")}</p>
              <p className="mt-2 text-3xl font-semibold">{response.items.length}</p>
            </article>
            <article className="rounded-3xl border border-border bg-background p-5">
              <p className="text-sm text-foreground/55">
                {tCommission("inbox.stats.openFixRequests")}
              </p>
              <p className="mt-2 text-3xl font-semibold">{openFixCount}</p>
            </article>
          </section>

          <section className="rounded-3xl border border-border bg-background p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{tCommission("inbox.filtersTitle")}</h2>
                <p className="text-sm text-foreground/60">
                  {tCommission("inbox.filtersDescription")}
                </p>
              </div>
              <Link
                href={`/${locale}/commission/${commissionUuid}`}
                className={IA_BUTTON_SECONDARY_SM}
              >
                {tCommission("inbox.clearFilters")}
              </Link>
            </div>

            <form
              method="get"
              action={`/${locale}/commission/${commissionUuid}`}
              className="mt-5 space-y-4"
            >
              <input type="hidden" name="page" value="1" />
              <input type="hidden" name="pageSize" value={String(query.pageSize)} />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(180px,1fr))]">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-foreground/80">
                    {tCommission("inbox.searchLabel")}
                  </span>
                  <input
                    name="q"
                    defaultValue={query.q ?? ""}
                    placeholder={tCommission("inbox.searchPlaceholder")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-foreground/80">
                    {tCommission("inbox.sortLabel")}
                  </span>
                  <select
                    name="sort"
                    defaultValue={query.sort}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="updatedAt">{tCommission("inbox.sort.updatedAt")}</option>
                    <option value="lastSubmittedAt">
                      {tCommission("inbox.sort.lastSubmittedAt")}
                    </option>
                    <option value="candidateSurname">
                      {tCommission("inbox.sort.candidateSurname")}
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-foreground/80">
                    {tCommission("inbox.directionLabel")}
                  </span>
                  <select
                    name="direction"
                    defaultValue={query.direction}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="desc">{tCommission("inbox.direction.desc")}</option>
                    <option value="asc">{tCommission("inbox.direction.asc")}</option>
                  </select>
                </label>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-foreground/80">
                  {tCommission("inbox.statusFilterLabel")}
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((status) => {
                    const translatedStatusKey = statusKey(status);
                    const label = translatedStatusKey
                      ? tApplications(translatedStatusKey)
                      : status;

                    return (
                      <label
                        key={status}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="status"
                          value={status}
                          defaultChecked={query.status.includes(status)}
                          className="size-4 rounded border-border"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex justify-end">
                <button type="submit" className={IA_BUTTON_PRIMARY_SM}>
                  {tCommission("inbox.applyFilters")}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-3">
            {response.items.length === 0 ? (
              <article className="rounded-3xl border border-dashed border-border bg-background px-6 py-12 text-center">
                <h2 className="text-lg font-semibold">{tCommission("inbox.emptyTitle")}</h2>
                <p className="mt-2 text-sm text-foreground/60">
                  {tCommission("inbox.emptyDescription")}
                </p>
              </article>
            ) : (
              response.items.map((item) => {
                const translatedStatusKey = statusKey(item.status);
                const statusLabel = translatedStatusKey
                  ? tApplications(translatedStatusKey)
                  : item.status;
                const translatedDegreeKey = degreeKey(item.degreeCode);
                const degreeLabel = translatedDegreeKey
                  ? tApplications(translatedDegreeKey)
                  : item.degreeCode;

                return (
                  <Link
                    key={item.uuid}
                    href={`/${locale}/commission/${commissionUuid}/applications/${item.uuid}`}
                    className="block rounded-3xl border border-border bg-background p-5 transition hover:border-primary/35 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">
                            {degreeLabel}
                          </p>
                          <h2 className="mt-2 text-xl font-semibold tracking-tight">
                            {getCandidateLabel(item, tCommission)}
                          </h2>
                          <p className="mt-1 text-sm text-foreground/60">
                            {item.candidateEmail ?? tCommission("inbox.noCandidateEmail")}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <ApplicationStatusBadge status={item.status} label={statusLabel} />
                          {item.hasOpenFixRequest && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                              {tCommission("inbox.badges.openFixRequest")}
                            </span>
                          )}
                          {item.canChangeStatus && (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                              {tCommission("inbox.badges.workflow")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-[220px] space-y-2 text-sm text-foreground/60">
                        <p>
                          <span className="font-medium text-foreground/80">
                            {tCommission("inbox.meta.updatedAt")}:
                          </span>{" "}
                          {formatDate(locale, item.updatedAt)}
                        </p>
                        <p>
                          <span className="font-medium text-foreground/80">
                            {tCommission("inbox.meta.lastSubmittedAt")}:
                          </span>{" "}
                          {formatDate(locale, item.lastSubmittedAt)}
                        </p>
                        <p className="text-primary">{tCommission("actions.openApplication")}</p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </section>

          {response.total > query.pageSize && (
            <nav className="flex items-center justify-between rounded-3xl border border-border bg-background p-4">
              <div className="text-sm text-foreground/60">
                {tCommission("inbox.pagination", {
                  page: response.page,
                  total: Math.max(1, Math.ceil(response.total / response.pageSize)),
                })}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/${locale}/commission/${commissionUuid}?${prevPageQuery}`}
                  className={`${IA_BUTTON_SECONDARY_SM} ${
                    response.page <= 1 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {tCommission("actions.previousPage")}
                </Link>
                <Link
                  href={`/${locale}/commission/${commissionUuid}?${nextPageQuery}`}
                  className={`${IA_BUTTON_SECONDARY_SM} ${
                    response.page * response.pageSize >= response.total
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  {tCommission("actions.nextPage")}
                </Link>
              </div>
            </nav>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-border bg-background p-5">
            <h2 className="text-lg font-semibold">{tCommission("inbox.sidebar.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              {tCommission("inbox.sidebar.description")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {membership.canManageWorkflow && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {tCommission("permissions.manageWorkflow")}
                </span>
              )}
              {membership.canDraftFixRequest && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  {tCommission("permissions.fixRequests")}
                </span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-background p-5">
            <h2 className="text-lg font-semibold">{tCommission("inbox.quickLinksTitle")}</h2>
            <div className="mt-4 space-y-2">
              {STATUS_FILTERS.slice(0, 4).map((status) => {
                const translatedStatusKey = statusKey(status);
                const label = translatedStatusKey
                  ? tApplications(translatedStatusKey)
                  : status;
                const quickQuery = buildInboxQueryString(query, {
                  page: 1,
                  status: [status],
                });

                return (
                  <Link
                    key={status}
                    href={`/${locale}/commission/${commissionUuid}?${quickQuery}`}
                    className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm transition hover:bg-muted"
                  >
                    <span>{label}</span>
                    <span className="text-foreground/35">→</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
