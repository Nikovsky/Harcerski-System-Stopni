// @file: apps/web/src/components/meetings/MyMeetingRegistrationsView.tsx
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type {
  MeetingStatus,
  MyMeetingRegistrationListItem,
} from "@hss/schemas";

import { MeetingCancellationButton } from "@/components/meetings/MeetingCancellationButton";
import { MeetingsCommissionBadge } from "@/components/meetings/MeetingsCommissionBadge";
import { MeetingStatusBadge } from "@/components/meetings/MeetingStatusBadge";

type Props = {
  registrations: MyMeetingRegistrationListItem[];
  listViewHref: string;
};

type MeetingStatusKey = `status.${MeetingStatus}`;
type CommissionLabelKey =
  | "commissionType.INSTRUCTOR"
  | "commissionType.SCOUT"
  | "commissionType.UNKNOWN";
type CancellationUnavailableKey =
  | "errors.cancellationDeadlinePassed"
  | "errors.cancellationNotAllowedStatus";

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

export function MyMeetingRegistrationsView({
  registrations,
  listViewHref,
}: Props) {
  const t = useTranslations("meetings");
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
  const registeredAtFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <header className="border-b border-border/70 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
          {t("myRegistrations.eyebrow")}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-card-foreground">
          {t("myRegistrations.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/70">
          {registrations.length > 0
            ? t("myRegistrations.description", {
                count: registrations.length,
              })
            : t("myRegistrations.emptyDescription")}
        </p>
      </header>

      {registrations.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-border/80 bg-muted/25 p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-card-foreground">
            {t("myRegistrations.emptyTitle")}
          </h3>
          <p className="mt-2 text-sm text-foreground/65">
            {t("myRegistrations.emptyDescription")}
          </p>
          <Link
            href={listViewHref}
            className="mt-5 inline-flex rounded-full border border-border/80 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
          >
            {t("myRegistrations.exploreCta")}
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {registrations.map((registration, index) => {
            const meetingDate = parseDateOnly(registration.date);
            const meetingDateLabel = dayFormatter.format(meetingDate);
            const meetingDateFullLabel = dayFormatter.format(meetingDate);
            const statusKey = toStatusKey(registration.status);
            const commissionLabel = t(
              toCommissionLabelKey(registration.commissionType),
            );
            const commissionDisplayName =
              registration.commissionName?.trim() || commissionLabel;
            const cancellationUnavailableKey = toCancellationUnavailableKey(
              registration.status,
            );
            const timeLabel = registration.slot
              ? t("myRegistrations.slotTime", {
                  timeRange: formatTimeRange(
                    timeFormatter,
                    registration.slot.startTime,
                    registration.slot.endTime,
                  ),
                })
              : registration.assignedTime
                ? t("myRegistrations.assignedTime", {
                    time: timeFormatter.format(
                      new Date(registration.assignedTime),
                    ),
                  })
                : t("myRegistrations.dayOnly");

            return (
              <article
                key={registration.registrationUuid}
                className={[
                  "rounded-2xl border border-border/80 p-4 shadow-sm",
                  index === 0 ? "bg-primary/6" : "bg-muted/20",
                ].join(" ")}
              >
                <header className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <MeetingsCommissionBadge
                        commissionType={registration.commissionType}
                      />
                      <MeetingStatusBadge
                        status={registration.status}
                        label={t(statusKey)}
                      />
                      {index === 0 ? (
                        <span className="inline-flex rounded-full border border-primary/30 bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                          {t("myRegistrations.nextBadge")}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-xl font-semibold capitalize text-card-foreground">
                      {meetingDateLabel}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-foreground/80">
                      {commissionDisplayName}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground/80">
                      {timeLabel}
                    </p>
                    <p className="mt-2 text-xs text-foreground/60">
                      {t("myRegistrations.registeredAt", {
                        dateTime: registeredAtFormatter.format(
                          new Date(registration.registeredAt),
                        ),
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    {registration.canCancelMyRegistration ? (
                      <MeetingCancellationButton
                        meetingUuid={registration.meetingUuid}
                        ariaLabel={
                          registration.slot
                            ? t("actions.cancelSlotAria", {
                                timeRange: formatTimeRange(
                                  timeFormatter,
                                  registration.slot.startTime,
                                 registration.slot.endTime,
                                ),
                                date: meetingDateFullLabel,
                                commission: commissionDisplayName,
                              })
                            : t("actions.cancelMeetingAria", {
                                date: meetingDateFullLabel,
                                commission: commissionDisplayName,
                              })
                        }
                      />
                    ) : (
                      <p className="max-w-xs rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
                        {t(cancellationUnavailableKey)}
                      </p>
                    )}
                  </div>
                </header>

                {registration.notes ? (
                  <p className="mt-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground/80">
                    {registration.notes}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
