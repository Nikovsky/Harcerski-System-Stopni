// @file: apps/web/src/components/meetings/MeetingCalendarView.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  MeetingBookingBlockedReasonCode,
  MeetingDayDetailItem,
  MeetingDayDetailsResponse,
  MeetingListItem,
} from "@hss/schemas/meeting";
import type { MeetingStatus } from "@hss/schemas/enums";
import { MeetingBookingButton } from "@/components/meetings/MeetingBookingButton";
import { MeetingCancellationButton } from "@/components/meetings/MeetingCancellationButton";
import { MeetingsCommissionBadge } from "@/components/meetings/MeetingsCommissionBadge";
import { MeetingStatusBadge } from "@/components/meetings/MeetingStatusBadge";
import { apiFetch } from "@/lib/api";

type MeetingsView = "list" | "calendar";
type MeetingsCommissionFilter = "all" | "scout" | "instructor";
type MeetingFilters = {
  open: boolean;
  available: boolean;
  commission: MeetingsCommissionFilter;
};
type CommissionLabelKey =
  | "commissionType.INSTRUCTOR"
  | "commissionType.SCOUT"
  | "commissionType.UNKNOWN";
type CancellationUnavailableKey =
  | "errors.cancellationDeadlinePassed"
  | "errors.cancellationNotAllowedStatus";

type Props = {
  meetings: MeetingListItem[];
  view: MeetingsView;
  filters: MeetingFilters;
  visibleMonth: string;
  previousMonthHref: string;
  nextMonthHref: string;
};

type BlockedReasonKey = `blocked.${MeetingBookingBlockedReasonCode}`;
type MeetingStatusKey = `status.${MeetingStatus}`;
type MeetingModeKey = `mode.${MeetingDayDetailItem["slotMode"]}`;
type KnownCommissionType = NonNullable<MeetingListItem["commissionType"]>;
type FilterableMeeting = Pick<
  MeetingListItem,
  "uuid" | "date" | "status" | "commissionType" | "canBook" | "myRegistrationUuid"
>;
type CalendarCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  meetings: MeetingListItem[];
};
type DayDetailsState = {
  status: "loading" | "ready" | "error";
  meetings: MeetingDayDetailItem[];
};

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function formatDateKey(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addUtcDays(value: Date, days: number): Date {
  const result = new Date(value.getTime());
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

function getWeekStartsOn(locale: string): number {
  const normalizedLocale = locale.toLowerCase();

  return normalizedLocale === "en" || normalizedLocale.startsWith("en-us")
    ? 0
    : 1;
}

function getTodayDateKey(): string {
  const now = new Date();

  return formatDateKey(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
}

function buildMeetingsFilterHref(
  pathname: string,
  month: string,
  view: MeetingsView,
  filters: MeetingFilters,
): string {
  const searchParams = new URLSearchParams({
    month,
    view,
  });

  if (view === "list" && filters.open) {
    searchParams.set("open", "1");
  }

  if (view === "list" && filters.available) {
    searchParams.set("available", "1");
  }

  if (filters.commission !== "all") {
    searchParams.set("commission", filters.commission);
  }

  return `${pathname}?${searchParams.toString()}`;
}

function hasMyRegistration(meeting: Pick<FilterableMeeting, "myRegistrationUuid">): boolean {
  return Boolean(meeting.myRegistrationUuid);
}

function matchesCommissionFilter(
  meeting: Pick<FilterableMeeting, "commissionType">,
  commission: MeetingsCommissionFilter,
): boolean {
  if (commission === "all") {
    return true;
  }

  return commission === "scout"
    ? meeting.commissionType === "SCOUT"
    : meeting.commissionType === "INSTRUCTOR";
}

function isMeetingAvailableForUser(
  meeting: Pick<FilterableMeeting, "canBook" | "myRegistrationUuid">,
): boolean {
  return meeting.canBook || hasMyRegistration(meeting);
}

function filterMeetings<T extends FilterableMeeting>(
  meetings: T[],
  filters: MeetingFilters,
): T[] {
  return meetings.filter((meeting) => {
    if (filters.open && meeting.status !== "OPEN_FOR_REGISTRATION") {
      return false;
    }

    if (filters.available && !isMeetingAvailableForUser(meeting)) {
      return false;
    }

    return matchesCommissionFilter(meeting, filters.commission);
  });
}

function sortMeetingsForDisplay<T extends FilterableMeeting>(meetings: T[]): T[] {
  return [...meetings].sort((left, right) => {
    const leftMine = hasMyRegistration(left) ? 1 : 0;
    const rightMine = hasMyRegistration(right) ? 1 : 0;

    if (leftMine !== rightMine) {
      return rightMine - leftMine;
    }

    const leftAvailable = left.canBook ? 1 : 0;
    const rightAvailable = right.canBook ? 1 : 0;

    if (leftAvailable !== rightAvailable) {
      return rightAvailable - leftAvailable;
    }

    return left.uuid.localeCompare(right.uuid);
  });
}

function hasActiveFilters(filters: MeetingFilters): boolean {
  return filters.open || filters.available || filters.commission !== "all";
}

function buildMeetingsByDate(
  meetings: MeetingListItem[],
): Record<string, MeetingListItem[]> {
  const groupedMeetings: Record<string, MeetingListItem[]> = {};

  for (const meeting of meetings) {
    const existingMeetings = groupedMeetings[meeting.date];
    if (existingMeetings) {
      existingMeetings.push(meeting);
    } else {
      groupedMeetings[meeting.date] = [meeting];
    }
  }

  for (const dateKey of Object.keys(groupedMeetings)) {
    groupedMeetings[dateKey] = sortMeetingsForDisplay(
      groupedMeetings[dateKey] ?? [],
    );
  }

  return groupedMeetings;
}

function buildCalendarCells(
  visibleMonth: string,
  meetingsByDate: Record<string, MeetingListItem[]>,
  weekStartsOn: number,
): CalendarCell[] {
  const monthStart = parseDateOnly(`${visibleMonth}-01`);
  const monthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  );
  const daysBeforeMonth =
    (monthStart.getUTCDay() - weekStartsOn + 7) % 7;
  const daysAfterMonth =
    6 - ((monthEnd.getUTCDay() - weekStartsOn + 7) % 7);
  const gridStart = addUtcDays(monthStart, -daysBeforeMonth);
  const gridEnd = addUtcDays(monthEnd, daysAfterMonth);
  const todayDateKey = getTodayDateKey();
  const cells: CalendarCell[] = [];

  for (
    let cursor = new Date(gridStart.getTime());
    cursor <= gridEnd;
    cursor = addUtcDays(cursor, 1)
  ) {
    const dateKey = formatDateKey(cursor);

    cells.push({
      date: cursor,
      dateKey,
      inCurrentMonth: dateKey.startsWith(visibleMonth),
      isToday: dateKey === todayDateKey,
      meetings: meetingsByDate[dateKey] ?? [],
    });
  }

  return cells;
}

function getWeekdayLabels(locale: string, weekStartsOn: number): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  const firstSunday = new Date(Date.UTC(2026, 0, 4));

  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(addUtcDays(firstSunday, weekStartsOn + index)),
  );
}

function getInitialSelectedDayKey(
  meetings: MeetingListItem[],
  visibleMonth: string,
): string {
  const todayDateKey = getTodayDateKey();
  const hasMeetingToday = meetings.some((meeting) => meeting.date === todayDateKey);

  if (todayDateKey.startsWith(visibleMonth) && hasMeetingToday) {
    return todayDateKey;
  }

  if (meetings.length > 0) {
    return meetings[0]?.date ?? `${visibleMonth}-01`;
  }

  return todayDateKey.startsWith(visibleMonth) ? todayDateKey : `${visibleMonth}-01`;
}

function getInitialExpandedDayKeys(meetings: MeetingListItem[]): string[] {
  const firstDate = meetings[0]?.date;
  return firstDate ? [firstDate] : [];
}

function getUniqueCommissionTypes(
  meetings: MeetingListItem[],
): KnownCommissionType[] {
  const types: KnownCommissionType[] = [];

  for (const meeting of meetings) {
    if (meeting.commissionType && !types.includes(meeting.commissionType)) {
      types.push(meeting.commissionType);
    }
  }

  return types;
}

function sortMeetingGroups(
  meetingsByDate: Record<string, MeetingListItem[]>,
): Array<[string, MeetingListItem[]]> {
  return Object.entries(meetingsByDate).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function toBlockedReasonKey(
  code: MeetingBookingBlockedReasonCode | null,
): BlockedReasonKey | null {
  return code ? `blocked.${code}` : null;
}

function toStatusKey(status: MeetingStatus): MeetingStatusKey {
  return `status.${status}`;
}

function toModeKey(slotMode: MeetingDayDetailItem["slotMode"]): MeetingModeKey {
  return `mode.${slotMode}`;
}

function toCommissionLabelKey(
  commissionType:
    | MeetingListItem["commissionType"]
    | MeetingDayDetailItem["commissionType"],
): CommissionLabelKey {
  switch (commissionType) {
    case "INSTRUCTOR":
      return "commissionType.INSTRUCTOR";
    case "SCOUT":
      return "commissionType.SCOUT";
    default:
      return "commissionType.UNKNOWN";
  }
}

function toCancellationUnavailableKey(
  status: MeetingStatus,
): CancellationUnavailableKey {
  return status === "OPEN_FOR_REGISTRATION"
    ? "errors.cancellationDeadlinePassed"
    : "errors.cancellationNotAllowedStatus";
}

function formatTimeRange(
  formatter: Intl.DateTimeFormat,
  startTime: string,
  endTime: string,
): string {
  return `${formatter.format(new Date(startTime))} - ${formatter.format(
    new Date(endTime),
  )}`;
}

function buildFilterChipClass(isActive: boolean): string {
  return [
    "inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm",
    isActive
      ? "border-primary/50 bg-primary text-primary-foreground shadow-sm"
      : "border-border/80 bg-background/70 text-foreground/75 hover:border-foreground/30 hover:bg-background hover:text-foreground",
  ].join(" ");
}

function buildSummaryChipClass(): string {
  return "inline-flex rounded-full border border-border/80 bg-muted/35 px-3 py-1 text-xs font-semibold text-foreground/85 shadow-sm";
}

type MeetingDayDetailsPrefetchProps = {
  dateKeys: string[];
  meetingsByDate: Record<string, MeetingListItem[]>;
  dayDetailsByDate: Record<string, DayDetailsState>;
  onPrefetch: (dateKey: string) => Promise<void>;
};

function MeetingDayDetailsPrefetch({
  dateKeys,
  meetingsByDate,
  dayDetailsByDate,
  onPrefetch,
}: MeetingDayDetailsPrefetchProps) {
  useEffect(() => {
    for (const dateKey of dateKeys) {
      if ((meetingsByDate[dateKey]?.length ?? 0) === 0 || dayDetailsByDate[dateKey]) {
        continue;
      }

      void onPrefetch(dateKey);
    }
  }, [dateKeys, dayDetailsByDate, meetingsByDate, onPrefetch]);

  return null;
}

export function MeetingCalendarView({
  meetings,
  view,
  filters,
  visibleMonth,
  previousMonthHref,
  nextMonthHref,
}: Props) {
  const t = useTranslations("meetings");
  const locale = useLocale();
  const pathname = usePathname();
  const filteredMeetings = filterMeetings(meetings, filters);
  const [selectedDayKeyState, setSelectedDayKey] = useState(() =>
    getInitialSelectedDayKey(filteredMeetings, visibleMonth),
  );
  const [expandedDayKeys, setExpandedDayKeys] = useState(() =>
    getInitialExpandedDayKeys(filteredMeetings),
  );
  const [dayDetailsByDate, setDayDetailsByDate] = useState<
    Record<string, DayDetailsState>
  >({});

  const weekStartsOn = getWeekStartsOn(locale);
  const meetingsByDate = buildMeetingsByDate(filteredMeetings);
  const selectedDayKey = selectedDayKeyState.startsWith(visibleMonth)
    ? selectedDayKeyState
    : getInitialSelectedDayKey(filteredMeetings, visibleMonth);
  const calendarCells = buildCalendarCells(
    visibleMonth,
    meetingsByDate,
    weekStartsOn,
  );
  const weekdayLabels = getWeekdayLabels(locale, weekStartsOn);
  const selectedMeetingSummaries = meetingsByDate[selectedDayKey] ?? [];
  const selectedDate = parseDateOnly(selectedDayKey);
  const monthDate = parseDateOnly(`${visibleMonth}-01`);
  const listGroups = sortMeetingGroups(meetingsByDate);
  const dayDetailsByDateRef = useRef<Record<string, DayDetailsState>>({});
  const clearFiltersHref = buildMeetingsFilterHref(pathname, visibleMonth, view, {
    open: false,
    available: false,
    commission: "all",
  });

  useEffect(() => {
    dayDetailsByDateRef.current = dayDetailsByDate;
  }, [dayDetailsByDate]);

  const loadDayDetails = useCallback(async (dateKey: string, force = false) => {
    const currentState = dayDetailsByDateRef.current[dateKey];
    if (!force && currentState) {
      return;
    }

    setDayDetailsByDate((currentValue) => ({
      ...currentValue,
      [dateKey]: {
        status: "loading",
        meetings: currentValue[dateKey]?.meetings ?? [],
      },
    }));

    try {
      const response = await apiFetch<MeetingDayDetailsResponse>(
        `meetings/by-date?date=${encodeURIComponent(dateKey)}`,
      );

      setDayDetailsByDate((currentValue) => ({
        ...currentValue,
        [dateKey]: {
          status: "ready",
          meetings: response.meetings,
        },
      }));
    } catch {
      setDayDetailsByDate((currentValue) => ({
        ...currentValue,
        [dateKey]: {
          status: "error",
          meetings: [],
        },
      }));
    }
  }, []);

  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const selectedDateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const dayNumberFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "UTC",
  });
  const dayAriaFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: "UTC",
  });
  const listDayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const filtersAreActive = hasActiveFilters(filters);
  const openFilterHref = buildMeetingsFilterHref(pathname, visibleMonth, view, {
    ...filters,
    open: !filters.open,
  });
  const availableFilterHref = buildMeetingsFilterHref(
    pathname,
    visibleMonth,
    view,
    {
      ...filters,
      available: !filters.available,
    },
  );
  const allCommissionsHref = buildMeetingsFilterHref(pathname, visibleMonth, view, {
    ...filters,
    commission: "all",
  });
  const scoutCommissionHref = buildMeetingsFilterHref(pathname, visibleMonth, view, {
    ...filters,
    commission: "scout",
  });
  const instructorCommissionHref = buildMeetingsFilterHref(
    pathname,
    visibleMonth,
    view,
    {
      ...filters,
      commission: "instructor",
    },
  );
  const monthLabel = monthFormatter.format(monthDate);
  const headingEyebrow =
    view === "calendar" ? t("calendar.legendTitle") : t("list.legendTitle");
  const headingHint =
    filteredMeetings.length === 0
      ? t("empty")
      : view === "calendar"
        ? t("calendar.dayHint")
        : t("list.dayHint");
  const selectedDayHeadingId = `meetings-selected-day-heading-${selectedDayKey}`;
  const selectedDayAnnouncement =
    selectedMeetingSummaries.length > 0
      ? t("calendar.selectedDayAnnouncement", {
          date: selectedDateFormatter.format(selectedDate),
          count: selectedMeetingSummaries.length,
        })
      : t("calendar.emptyDayAnnouncement", {
          date: selectedDateFormatter.format(selectedDate),
        });

  const renderMeetingCard = (
    meeting: MeetingDayDetailItem,
    emphasisClassName = "bg-muted/30",
  ) => {
    const blockedReasonKey = toBlockedReasonKey(meeting.bookingBlockedReasonCode);
    const statusKey = toStatusKey(meeting.status);
    const modeKey = toModeKey(meeting.slotMode);
    const commissionLabel = t(toCommissionLabelKey(meeting.commissionType));
    const commissionDisplayName = meeting.commissionName?.trim() || commissionLabel;
    const meetingDateLabel = dayAriaFormatter.format(parseDateOnly(meeting.date));
    const cancellationUnavailableKey = toCancellationUnavailableKey(meeting.status);

    return (
      <article
        key={meeting.uuid}
        className={`rounded-2xl border border-border/80 p-3 shadow-sm sm:p-4 ${emphasisClassName}`}
      >
        <header className="flex flex-col gap-3 border-b border-border/70 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <MeetingsCommissionBadge commissionType={meeting.commissionType} />
            <MeetingStatusBadge status={meeting.status} label={t(statusKey)} />
            {hasMyRegistration(meeting) ? (
              <span className={buildSummaryChipClass()}>{t("mine.badge")}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-card-foreground">
                {commissionDisplayName}
              </h3>
              <p className="mt-1 text-sm font-medium text-foreground/70">
                {t(modeKey)}
              </p>
              <p className="mt-1 text-sm text-foreground/65">
                {t("stats.registrations", {
                  count: meeting.registrationsCount,
                })}
              </p>
            </div>

            {meeting.slotMode === "SLOTS" ? (
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm font-medium text-foreground/80">
                {t("stats.availableSlots", {
                  available: meeting.availableSlots,
                  total: meeting.totalSlots,
                })}
              </div>
            ) : null}
          </div>
        </header>

        {meeting.notes ? (
          <p className="mt-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground/80">
            {meeting.notes}
          </p>
        ) : null}

        {blockedReasonKey && !meeting.canBook ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
            {t(blockedReasonKey)}
          </p>
        ) : null}

        {meeting.slotMode === "SLOTS" ? (
          <div className="mt-3 space-y-2">
            {meeting.slots.length === 0 ? (
              <p className="text-sm text-foreground/70">{t("slots.none")}</p>
            ) : null}

            {meeting.slots.map((slot) => {
              const slotIsActionable = !slot.isBooked && meeting.canBook;
              const slotTimeLabel = formatTimeRange(
                timeFormatter,
                slot.startTime,
                slot.endTime,
              );

              return (
                <div
                  key={slot.uuid}
                  className="flex flex-col gap-2 rounded-xl border border-border/80 bg-background/75 px-3 py-2 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {slotTimeLabel}
                    </p>
                    <p className="text-xs text-foreground/70">
                      {slot.bookedByMe
                        ? t("slots.bookedByYou")
                        : slot.isBooked
                          ? t("slots.booked")
                          : t("slots.free")}
                    </p>
                  </div>

                  {slot.bookedByMe ? (
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs font-medium text-foreground">
                        {t("slots.bookedByYou")}
                      </p>
                      {meeting.canCancelMyRegistration &&
                      meeting.myRegistrationUuid ? (
                        <MeetingCancellationButton
                          meetingUuid={meeting.uuid}
                          ariaLabel={t("actions.cancelSlotAria", {
                           timeRange: slotTimeLabel,
                           date: meetingDateLabel,
                            commission: commissionDisplayName,
                          })}
                        />
                      ) : (
                        <p className="max-w-xs rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-right text-xs text-foreground">
                          {t(cancellationUnavailableKey)}
                        </p>
                      )}
                    </div>
                  ) : slot.isBooked ? (
                    <p className="text-xs font-medium text-foreground/70">
                      {t("slots.booked")}
                    </p>
                  ) : slotIsActionable ? (
                    <MeetingBookingButton
                      meetingUuid={meeting.uuid}
                      slotUuid={slot.uuid}
                      ariaLabel={t("actions.bookSlotAria", {
                         timeRange: slotTimeLabel,
                         date: meetingDateLabel,
                         commission: commissionDisplayName,
                       })}
                       disabled={false}
                     />
                  ) : blockedReasonKey ? null : (
                    <p className="text-xs text-foreground/60">
                      {t("slots.notAvailableNow")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-border/80 bg-background/75 px-3 py-3">
            <p className="mb-2 text-sm text-foreground/80">
              {t("dayOnly.description")}
            </p>
            {meeting.myRegistrationUuid ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-foreground">
                  {t("dayOnly.bookedByYou")}
                </p>
                {meeting.canCancelMyRegistration ? (
                  <MeetingCancellationButton
                    meetingUuid={meeting.uuid}
                    ariaLabel={t("actions.cancelMeetingAria", {
                       date: meetingDateLabel,
                       commission: commissionDisplayName,
                     })}
                   />
                ) : (
                  <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-foreground">
                    {t(cancellationUnavailableKey)}
                  </p>
                )}
              </div>
            ) : meeting.canBook ? (
              <MeetingBookingButton
                meetingUuid={meeting.uuid}
                   ariaLabel={t("actions.bookMeetingAria", {
                     date: meetingDateLabel,
                     commission: commissionDisplayName,
                   })}
                   disabled={false}
                 />
            ) : blockedReasonKey ? null : (
              <p className="text-sm text-foreground/60">
                {t("dayOnly.notAvailableNow")}
              </p>
            )}
          </div>
        )}
      </article>
    );
  };

  const renderDayDetailsState = (
    dateKey: string,
    emphasisClassName: string,
  ) => {
    const state = dayDetailsByDate[dateKey];

    if (!state || state.status === "loading") {
      return (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5"
        >
          <p className="text-sm font-semibold text-foreground">
            {t("details.loading")}
          </p>
        </div>
      );
    }

    if (state.status === "error") {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5"
        >
          <p className="text-sm font-semibold text-foreground">
            {t("details.loadFailed")}
          </p>
          <button
            type="button"
            onClick={() => {
              void loadDayDetails(dateKey, true);
            }}
            className="mt-3 inline-flex rounded-md border border-amber-300/40 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("details.retry")}
          </button>
        </div>
      );
    }

    const visibleMeetings = sortMeetingsForDisplay(
      filterMeetings(state.meetings, filters),
    );

    if (state.meetings.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/25 p-5">
          <p className="text-sm font-semibold text-foreground">
            {t("details.emptyTitle")}
          </p>
          <p className="mt-2 text-sm text-foreground/60">
            {t("details.emptyDescription")}
          </p>
        </div>
      );
    }

    if (visibleMeetings.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/25 p-5">
          <p className="text-sm font-semibold text-foreground">
            {t("details.filteredEmptyTitle")}
          </p>
          <p className="mt-2 text-sm text-foreground/60">
            {t("details.filteredEmptyDescription")}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {visibleMeetings.map((meeting) =>
          renderMeetingCard(meeting, emphasisClassName),
        )}
      </div>
    );
  };

  const renderEmptyState = (
    title: string,
    description: string,
    variant: "calendar" | "list" | "filtered",
  ) => (
    <section className="rounded-3xl border border-dashed border-border/80 bg-card p-6 text-center shadow-sm sm:p-8">
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm text-foreground/65">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {variant === "filtered" ? (
          <Link
            href={clearFiltersHref}
            className={buildFilterChipClass(false)}
          >
            {t("filters.clear")}
          </Link>
        ) : null}
        <Link
          href={previousMonthHref}
          className="inline-flex rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
        >
          {t("navigation.previousMonth")}
        </Link>
        <Link
          href={nextMonthHref}
          className="inline-flex rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
        >
          {t("navigation.nextMonth")}
        </Link>
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <MeetingDayDetailsPrefetch
        dateKeys={
          view === "calendar"
            ? selectedMeetingSummaries.length > 0
              ? [selectedDayKey]
              : []
            : expandedDayKeys
        }
        meetingsByDate={meetingsByDate}
        dayDetailsByDate={dayDetailsByDate}
        onPrefetch={loadDayDetails}
      />
      <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
              {headingEyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold capitalize text-card-foreground">
              {monthLabel}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-foreground/70">
              {headingHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Link
              href={previousMonthHref}
              className="inline-flex rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
            >
              {t("navigation.previousMonth")}
            </Link>
            <Link
              href={nextMonthHref}
              className="inline-flex rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
            >
              {t("navigation.nextMonth")}
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <MeetingsCommissionBadge commissionType="SCOUT" />
          <MeetingsCommissionBadge commissionType="INSTRUCTOR" />
        </div>

        <div className="mt-5 lg:mt-6">
          <div className="sticky top-3 z-10 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-sm backdrop-blur lg:static lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
                  {t("filters.title")}
                </p>
                {filtersAreActive ? (
                  <Link href={clearFiltersHref} className={buildFilterChipClass(false)}>
                    {t("filters.clear")}
                  </Link>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {view === "list" ? (
                  <>
                    <Link
                      href={openFilterHref}
                      className={buildFilterChipClass(filters.open)}
                    >
                      {t("filters.open")}
                    </Link>
                    <Link
                      href={availableFilterHref}
                      className={buildFilterChipClass(filters.available)}
                    >
                      {t("filters.available")}
                    </Link>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={allCommissionsHref}
                  className={buildFilterChipClass(filters.commission === "all")}
                >
                  {t("filters.allCommissions")}
                </Link>
                <Link
                  href={scoutCommissionHref}
                  className={buildFilterChipClass(filters.commission === "scout")}
                >
                  {t("filters.scout")}
                </Link>
                <Link
                  href={instructorCommissionHref}
                  className={buildFilterChipClass(filters.commission === "instructor")}
                >
                  {t("filters.instructor")}
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                <span className={buildSummaryChipClass()}>
                  {t("filters.resultsCount", {
                    count: filteredMeetings.length,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {view === "calendar" ? (
        meetings.length === 0 ? (
          renderEmptyState(
            t("calendar.emptyMonthTitle"),
            t("calendar.emptyMonthDescription"),
            "calendar",
          )
        ) : filteredMeetings.length === 0 ? (
          renderEmptyState(
            t("filters.emptyTitle"),
            t("filters.emptyDescription"),
            "filtered",
          )
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.95fr)]">
            <section
              aria-label={t("calendar.monthAriaLabel", { month: monthLabel })}
              className="rounded-3xl border border-border/80 bg-card p-2.5 shadow-sm sm:p-3"
            >
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weekdayLabels.map((weekday, index) => (
                  <div
                    key={`${weekday}-${index}`}
                    className="px-1 pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45 sm:text-xs sm:tracking-[0.18em]"
                  >
                    {weekday}
                  </div>
                ))}

                {calendarCells.map((cell) => {
                  const isSelected = cell.dateKey === selectedDayKey;
                  const hasMeetings = cell.meetings.length > 0;
                  const hasMyMeeting = cell.meetings.some((meeting) =>
                    hasMyRegistration(meeting),
                  );
                  const uniqueTypes = getUniqueCommissionTypes(cell.meetings);
                  const dayLabel = dayAriaFormatter.format(cell.date);
                  const buttonLabel = [
                    t("calendar.dayAriaLabel", { date: dayLabel }),
                    hasMeetings
                      ? t("calendar.selectedDayCount", {
                          count: cell.meetings.length,
                        })
                      : "",
                    hasMyMeeting ? t("mine.calendarAria") : "",
                  ]
                    .filter(Boolean)
                    .join(". ");

                  if (!cell.inCurrentMonth) {
                    return (
                      <div
                        key={cell.dateKey}
                        aria-label={t("calendar.outsideMonthAriaLabel")}
                        className="min-h-[4.75rem] rounded-2xl border border-dashed border-border/60 bg-muted/25 p-2 text-right text-xs text-foreground/30 sm:min-h-[6.5rem]"
                      >
                        {dayNumberFormatter.format(cell.date)}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDayKey(cell.dateKey)}
                      aria-pressed={isSelected}
                      aria-label={buttonLabel}
                      className={[
                        "flex min-h-[4.75rem] flex-col rounded-2xl border p-2 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[6.5rem] sm:p-2.5",
                        hasMeetings
                          ? "border-emerald-400/35 bg-emerald-500/10 hover:border-emerald-300/45 hover:bg-emerald-500/15"
                          : "border-border/70 bg-background/75 hover:border-foreground/20 hover:bg-background",
                        isSelected
                          ? "border-sky-400/70 bg-sky-500/15 ring-2 ring-sky-400/30"
                          : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-sm font-semibold text-foreground">
                          {dayNumberFormatter.format(cell.date)}
                        </span>

                        <div className="flex items-center gap-1">
                          {cell.isToday ? (
                            <span className="rounded-full border border-sky-400/45 bg-sky-500/12 px-1.5 py-0.5 text-[9px] font-semibold text-foreground shadow-sm sm:text-[10px]">
                              {t("calendar.today")}
                            </span>
                          ) : null}

                          {hasMeetings ? (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                              {cell.meetings.length}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1 sm:mt-3">
                        {hasMyMeeting ? (
                          <>
                            <span
                              aria-hidden="true"
                              className="inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-sm sm:hidden"
                            />
                            <span className="hidden rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-flex">
                              {t("mine.calendarMarker")}
                            </span>
                          </>
                        ) : null}
                        {uniqueTypes.slice(0, 2).map((type) => (
                          <MeetingsCommissionBadge
                            key={`${cell.dateKey}-${type}`}
                            commissionType={type}
                            compact
                          />
                        ))}
                        {cell.meetings.length > 2 ? (
                          <span className="inline-flex rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 shadow-sm">
                            +{cell.meetings.length - 2}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

          <aside
            role="region"
            aria-labelledby={selectedDayHeadingId}
            className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm xl:sticky xl:top-6 xl:self-start"
          >
            <p className="sr-only" role="status" aria-live="polite">
              {selectedDayAnnouncement}
            </p>
            <header className="border-b border-border/70 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
                {t("calendar.selectedDayEyebrow")}
              </p>
              <h2
                id={selectedDayHeadingId}
                className="mt-1 text-xl font-semibold capitalize text-card-foreground"
              >
                {t("calendar.selectedDayTitle", {
                  date: selectedDateFormatter.format(selectedDate),
                })}
              </h2>
              <p className="mt-2 text-sm text-foreground/65">
                {selectedMeetingSummaries.length > 0
                  ? t("calendar.selectedDayCount", {
                      count: selectedMeetingSummaries.length,
                    })
                  : t("calendar.emptyDayDescription")}
              </p>
            </header>

            {selectedMeetingSummaries.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/25 p-5">
                <p className="text-sm font-semibold text-foreground">
                  {t("calendar.emptyDayTitle")}
                </p>
                <p className="mt-2 text-sm text-foreground/60">
                  {t("calendar.emptyDayDescription")}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {renderDayDetailsState(selectedDayKey, "bg-muted/25")}
              </div>
            )}
          </aside>
        </div>
        )
      ) : meetings.length === 0 ? (
        renderEmptyState(
          t("list.emptyTitle"),
          t("list.emptyDescription"),
          "list",
        )
      ) : filteredMeetings.length === 0 ? (
        renderEmptyState(
          t("filters.emptyTitle"),
          t("filters.emptyDescription"),
          "filtered",
        )
      ) : (
        <section className="space-y-4">
          {listGroups.map(([dateKey, meetingsForDay]) => {
            const isExpanded = expandedDayKeys.includes(dateKey);
            const dayHasMyRegistration = meetingsForDay.some((meeting) =>
              hasMyRegistration(meeting),
            );
            const uniqueTypes = getUniqueCommissionTypes(meetingsForDay);
            const dayLabel = listDayFormatter.format(parseDateOnly(dateKey));
            const dayToggleButtonId = `meetings-day-toggle-${dateKey}`;
            const dayDetailsRegionId = `meetings-day-details-${dateKey}`;

            return (
              <div
                key={dateKey}
                className="rounded-3xl border border-border/80 bg-card p-3 shadow-sm sm:p-4"
              >
                <header className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      {t("list.dayEyebrow")}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold capitalize text-card-foreground">
                      {dayLabel}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {uniqueTypes.map((type) => (
                        <MeetingsCommissionBadge
                          key={`${dateKey}-${type}`}
                          commissionType={type}
                        />
                      ))}
                      <span className="inline-flex rounded-full border border-border/80 bg-muted/35 px-3 py-1 text-xs font-semibold text-foreground/80 shadow-sm">
                        {t("calendar.selectedDayCount", {
                          count: meetingsForDay.length,
                        })}
                      </span>
                      {dayHasMyRegistration ? (
                        <span className={buildSummaryChipClass()}>
                          {t("mine.badge")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    id={dayToggleButtonId}
                    type="button"
                    onClick={() => {
                      setExpandedDayKeys((currentValue) =>
                        currentValue.includes(dateKey)
                          ? currentValue.filter((value) => value !== dateKey)
                          : [...currentValue, dateKey].sort(),
                      );

                      if (!dayDetailsByDate[dateKey]) {
                        void loadDayDetails(dateKey);
                      }
                    }}
                    aria-expanded={isExpanded}
                    aria-controls={dayDetailsRegionId}
                    aria-label={
                      isExpanded
                        ? t("details.hideDayAria", { date: dayLabel })
                        : t("details.showDayAria", {
                            date: dayLabel,
                            count: meetingsForDay.length,
                          })
                    }
                    className="inline-flex self-start rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
                  >
                    {isExpanded ? t("details.hideDay") : t("details.showDay")}
                  </button>
                </header>

                {isExpanded ? (
                  <div
                    id={dayDetailsRegionId}
                    role="region"
                    aria-labelledby={dayToggleButtonId}
                    className="mt-4"
                  >
                    {renderDayDetailsState(dateKey, "bg-muted/20")}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
