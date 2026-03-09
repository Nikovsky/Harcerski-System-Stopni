// @file: apps/web/src/app/[locale]/meetings/page.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ZodError, z } from "zod";
import {
  meetingListItemSchema,
  myMeetingRegistrationsResponseSchema,
  type MeetingListItem,
  type MyMeetingRegistrationListItem,
} from "@hss/schemas";

import {
  BffServerFetchError,
  bffServerFetchValidated,
} from "@/app/[locale]/meetings/_server/bff-fetch";
import { MeetingCalendarView } from "@/components/meetings/MeetingCalendarView";
import { MyMeetingRegistrationsView } from "@/components/meetings/MyMeetingRegistrationsView";

const MONTH_PARAM_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const VIEW_PARAM_VALUES = new Set(["list", "calendar", "mine"]);
const COMMISSION_PARAM_VALUES = new Set(["scout", "instructor"]);

type MeetingsView = "list" | "calendar" | "mine";
type MeetingsCommissionFilter = "all" | "scout" | "instructor";
type MeetingsFilters = {
  open: boolean;
  available: boolean;
  commission: MeetingsCommissionFilter;
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    month?: string | string[];
    view?: string | string[];
    open?: string | string[];
    available?: string | string[];
    commission?: string | string[];
  }>;
};

function formatMonthParam(year: number, monthIndex: number): string {
  return `${year.toString().padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function formatIsoDate(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getCurrentMonthContext() {
  const now = new Date();

  return {
    year: now.getUTCFullYear(),
    monthIndex: now.getUTCMonth(),
  };
}

function parseRequestedMonth(value?: string) {
  if (!value || !MONTH_PARAM_REGEX.test(value)) {
    const fallback = getCurrentMonthContext();

    return {
      ...fallback,
      param: formatMonthParam(fallback.year, fallback.monthIndex),
    };
  }

  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  return {
    year,
    monthIndex,
    param: formatMonthParam(year, monthIndex),
  };
}

function shiftMonth(year: number, monthIndex: number, delta: number) {
  const shifted = new Date(Date.UTC(year, monthIndex + delta, 1));

  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    param: formatMonthParam(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
    ),
  };
}

function buildMeetingsViewHref(
  locale: string,
  params: {
    month: string;
    view: MeetingsView;
    filters: MeetingsFilters;
  },
): string {
  const searchParams = new URLSearchParams({
    month: params.month,
    view: params.view,
  });

  if (params.view === "list") {
    if (params.filters.open) {
      searchParams.set("open", "1");
    }

    if (params.filters.available) {
      searchParams.set("available", "1");
    }
  }

  if (params.view !== "mine" && params.filters.commission !== "all") {
    searchParams.set("commission", params.filters.commission);
  }

  return `/${locale}/meetings?${searchParams.toString()}`;
}

function parseRequestedView(value?: string): MeetingsView {
  return VIEW_PARAM_VALUES.has(value ?? "") ? (value as MeetingsView) : "list";
}

function parseBooleanParam(value?: string): boolean {
  return value === "1";
}

function parseRequestedCommission(
  value?: string,
): MeetingsCommissionFilter {
  return COMMISSION_PARAM_VALUES.has(value ?? "")
    ? (value as MeetingsCommissionFilter)
    : "all";
}

function normalizeFiltersForView(
  view: MeetingsView,
  filters: MeetingsFilters,
): MeetingsFilters {
  if (view === "calendar") {
    return {
      open: false,
      available: false,
      commission: filters.commission,
    };
  }

  if (view === "mine") {
    return {
      open: false,
      available: false,
      commission: "all",
    };
  }

  return filters;
}

function buildViewToggleClass(isActive: boolean): string {
  return [
    "inline-flex rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    isActive
      ? "bg-card text-foreground shadow-sm ring-1 ring-inset ring-border"
      : "text-foreground/70 hover:bg-background/70 hover:text-foreground",
  ].join(" ");
}

export default async function MeetingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const rawMonth = Array.isArray(resolvedSearchParams.month)
    ? resolvedSearchParams.month[0]
    : resolvedSearchParams.month;
  const rawView = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;
  const rawOpen = Array.isArray(resolvedSearchParams.open)
    ? resolvedSearchParams.open[0]
    : resolvedSearchParams.open;
  const rawAvailable = Array.isArray(resolvedSearchParams.available)
    ? resolvedSearchParams.available[0]
    : resolvedSearchParams.available;
  const rawCommission = Array.isArray(resolvedSearchParams.commission)
    ? resolvedSearchParams.commission[0]
    : resolvedSearchParams.commission;
  const visibleMonth = parseRequestedMonth(rawMonth);
  const view = parseRequestedView(rawView);
  const filters: MeetingsFilters = {
    open: parseBooleanParam(rawOpen),
    available: parseBooleanParam(rawAvailable),
    commission: parseRequestedCommission(rawCommission),
  };
  const activeViewFilters = normalizeFiltersForView(view, filters);
  const monthStart = new Date(
    Date.UTC(visibleMonth.year, visibleMonth.monthIndex, 1),
  );
  const monthEnd = new Date(
    Date.UTC(visibleMonth.year, visibleMonth.monthIndex + 1, 0),
  );
  const previousMonth = shiftMonth(
    visibleMonth.year,
    visibleMonth.monthIndex,
    -1,
  );
  const nextMonth = shiftMonth(visibleMonth.year, visibleMonth.monthIndex, 1);
  const listViewHref = buildMeetingsViewHref(locale, {
    month: visibleMonth.param,
    view: "list",
    filters,
  });
  const calendarViewHref = buildMeetingsViewHref(locale, {
    month: visibleMonth.param,
    view: "calendar",
    filters,
  });
  const mineViewHref = buildMeetingsViewHref(locale, {
    month: visibleMonth.param,
    view: "mine",
    filters,
  });
  const retryHref = buildMeetingsViewHref(locale, {
    month: visibleMonth.param,
    view,
    filters: activeViewFilters,
  });
  const t = await getTranslations("meetings");

  let meetings: MeetingListItem[] = [];
  let myRegistrations: MyMeetingRegistrationListItem[] = [];
  let fetchError: string | null = null;

  try {
    if (view === "mine") {
      const response = await bffServerFetchValidated(
        myMeetingRegistrationsResponseSchema,
        "meetings/my-registrations",
      );
      myRegistrations = response.registrations;
    } else {
      meetings = await bffServerFetchValidated(
        z.array(meetingListItemSchema),
        `meetings?fromDate=${formatIsoDate(monthStart)}&toDate=${formatIsoDate(monthEnd)}&limit=100`,
      );
    }
  } catch (error) {
    if (error instanceof BffServerFetchError) {
      if (error.status === 401) {
        fetchError = t("errors.authRequired");
      } else if (error.status === 403) {
        fetchError = t("errors.forbidden");
      } else if (error.status === 503) {
        fetchError = t("errors.serviceUnavailable");
      } else {
        fetchError = t("errors.loadFailed");
      }
    } else if (error instanceof ZodError) {
      fetchError = t("errors.loadFailed");
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("subtitle")}</p>
      </header>

      <section className="mb-6 rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="inline-flex rounded-full border border-border/80 bg-muted/40 p-1 shadow-sm">
          <Link
            href={listViewHref}
            aria-current={view === "list" ? "page" : undefined}
            className={buildViewToggleClass(view === "list")}
          >
            {t("views.list")}
          </Link>
          <Link
            href={calendarViewHref}
            aria-current={view === "calendar" ? "page" : undefined}
            className={buildViewToggleClass(view === "calendar")}
          >
            {t("views.calendar")}
          </Link>
          <Link
            href={mineViewHref}
            aria-current={view === "mine" ? "page" : undefined}
            className={buildViewToggleClass(view === "mine")}
          >
            {t("views.mine")}
          </Link>
        </div>
      </section>

      {fetchError ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>{fetchError}</p>
          <Link
            href={retryHref}
            className="mt-3 inline-flex rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium hover:bg-rose-100"
          >
            {t("actions.retry")}
          </Link>
        </div>
      ) : view === "mine" ? (
        <MyMeetingRegistrationsView
          registrations={myRegistrations}
          listViewHref={listViewHref}
        />
      ) : (
        <MeetingCalendarView
          meetings={meetings}
          view={view}
          filters={activeViewFilters}
          visibleMonth={visibleMonth.param}
          previousMonthHref={buildMeetingsViewHref(locale, {
            month: previousMonth.param,
            view,
            filters: activeViewFilters,
          })}
          nextMonthHref={buildMeetingsViewHref(locale, {
            month: nextMonth.param,
            view,
            filters: activeViewFilters,
          })}
        />
      )}
    </div>
  );
}
