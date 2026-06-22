// @file: apps/web/src/components/meetings/UpcomingMeetingCard.tsx
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type {
  MeetingStatus,
  MyMeetingRegistrationListItem,
} from "@hss/schemas";

import { MeetingsCommissionBadge } from "@/components/meetings/MeetingsCommissionBadge";
import { MeetingStatusBadge } from "@/components/meetings/MeetingStatusBadge";

type Props = {
  registration: MyMeetingRegistrationListItem | null;
  mineHref: string;
  listHref: string;
  loadFailed?: boolean;
};

type MeetingStatusKey = `status.${MeetingStatus}`;
type CommissionLabelKey =
  | "commissionType.INSTRUCTOR"
  | "commissionType.SCOUT"
  | "commissionType.UNKNOWN";

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toStatusKey(status: MeetingStatus): MeetingStatusKey {
  return `status.${status}`;
}

function toCommissionLabelKey(
  commissionType: MyMeetingRegistrationListItem["commissionType"],
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

function formatTimeRange(
  formatter: Intl.DateTimeFormat,
  startTime: string,
  endTime: string,
): string {
  return `${formatter.format(new Date(startTime))} - ${formatter.format(
    new Date(endTime),
  )}`;
}

export function UpcomingMeetingCard({
  registration,
  mineHref,
  listHref,
  loadFailed = false,
}: Props) {
  const tCommon = useTranslations("common.dashboardPage.upcomingMeeting");
  const tMeetings = useTranslations("meetings");
  const locale = useLocale();
  const dayFormatter = new Intl.DateTimeFormat(locale, {
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

  if (loadFailed) {
    return (
      <section className="rounded-3xl border border-amber-400/35 bg-amber-500/10 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/70">
          {tCommon("eyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-card-foreground">
          {tCommon("unavailableTitle")}
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          {tCommon("unavailableDescription")}
        </p>
        <Link
          href={mineHref}
          className="mt-5 inline-flex rounded-full border border-border/80 bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
        >
          {tCommon("viewAllCta")}
        </Link>
      </section>
    );
  }

  if (!registration) {
    return (
      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/70">
          {tCommon("eyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-card-foreground">
          {tCommon("emptyTitle")}
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          {tCommon("emptyDescription")}
        </p>
        <Link
          href={listHref}
          className="mt-5 inline-flex rounded-full border border-primary/50 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          {tCommon("browseCta")}
        </Link>
      </section>
    );
  }

  const meetingDateLabel = dayFormatter.format(parseDateOnly(registration.date));
  const statusKey = toStatusKey(registration.status);
  const commissionLabel = tMeetings(
    toCommissionLabelKey(registration.commissionType),
  );
  const commissionDisplayName =
    registration.commissionName?.trim() || commissionLabel;
  const timeLabel = registration.slot
    ? tMeetings("myRegistrations.slotTime", {
        timeRange: formatTimeRange(
          timeFormatter,
          registration.slot.startTime,
          registration.slot.endTime,
        ),
      })
    : registration.assignedTime
      ? tMeetings("myRegistrations.assignedTime", {
          time: timeFormatter.format(new Date(registration.assignedTime)),
        })
      : tMeetings("myRegistrations.dayOnly");

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
      <header className="border-b border-border/70 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/70">
          {tCommon("eyebrow")}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-card-foreground">
          {tCommon("title")}
        </h2>
        <p className="mt-2 text-sm text-foreground/70">
          {tCommon("description")}
        </p>
      </header>

      <div className="mt-4 rounded-2xl border border-border/80 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <MeetingsCommissionBadge commissionType={registration.commissionType} />
          <MeetingStatusBadge
            status={registration.status}
            label={tMeetings(statusKey)}
          />
        </div>

        <h3 className="mt-3 text-xl font-semibold capitalize text-card-foreground">
          {meetingDateLabel}
        </h3>
        <p className="mt-1 text-sm font-medium text-foreground/85">
          {commissionDisplayName}
        </p>
        <p className="mt-1 text-sm text-foreground/70">{timeLabel}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={mineHref}
            className="inline-flex rounded-full border border-primary/50 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            {tCommon("viewAllCta")}
          </Link>
          <Link
            href={listHref}
            className="inline-flex rounded-full border border-border/80 bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
          >
            {tCommon("browseCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
