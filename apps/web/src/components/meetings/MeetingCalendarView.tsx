// @file: apps/web/src/components/meetings/MeetingCalendarView.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import type {
  MeetingBookingBlockedReasonCode,
  MeetingListItem,
} from "@hss/schemas";
import { MeetingBookingButton } from "@/components/meetings/MeetingBookingButton";
import { MeetingCancellationButton } from "@/components/meetings/MeetingCancellationButton";
import { MeetingStatusBadge } from "@/components/meetings/MeetingStatusBadge";

type Props = {
  meetings: MeetingListItem[];
};

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function mapBlockedReason(
  code: MeetingBookingBlockedReasonCode | null,
): "blocked.NOT_APPROVED_APPLICATION" | "blocked.MEETING_NOT_OPEN" | "blocked.ALREADY_REGISTERED" | "blocked.NO_FREE_SLOTS" | null {
  if (!code) return null;
  switch (code) {
    case "NOT_APPROVED_APPLICATION":
      return "blocked.NOT_APPROVED_APPLICATION";
    case "MEETING_NOT_OPEN":
      return "blocked.MEETING_NOT_OPEN";
    case "ALREADY_REGISTERED":
      return "blocked.ALREADY_REGISTERED";
    case "NO_FREE_SLOTS":
      return "blocked.NO_FREE_SLOTS";
    default:
      return null;
  }
}

export function MeetingCalendarView({ meetings }: Props) {
  const t = useTranslations("meetings");
  const locale = useLocale();

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (meetings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-foreground/60">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const blockedReasonKey = mapBlockedReason(meeting.bookingBlockedReasonCode);
        const statusKey = `status.${meeting.status}` as
          | "status.DRAFT"
          | "status.OPEN_FOR_REGISTRATION"
          | "status.CLOSED"
          | "status.COMPLETED"
          | "status.CANCELLED";
        const modeKey = `mode.${meeting.slotMode}` as
          | "mode.SLOTS"
          | "mode.DAY_ONLY";

        return (
          <article
            key={meeting.uuid}
            className="rounded-lg border border-border bg-card p-4"
          >
            <header className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">
                  {dateFormatter.format(parseDateOnly(meeting.date))}
                </h2>
                <p className="text-sm text-foreground/70">{t(modeKey)}</p>
              </div>

              <MeetingStatusBadge status={meeting.status} label={t(statusKey)} />
            </header>

            <div className="mb-3 text-sm text-foreground/80">
              <p>{t("stats.registrations", { count: meeting.registrationsCount })}</p>
              {meeting.slotMode === "SLOTS" && (
                <p>
                  {t("stats.availableSlots", {
                    available: meeting.availableSlots,
                    total: meeting.totalSlots,
                  })}
                </p>
              )}
            </div>

            {meeting.notes && (
              <p className="mb-3 rounded-md bg-muted px-3 py-2 text-sm text-foreground/80">
                {meeting.notes}
              </p>
            )}

            {blockedReasonKey && !meeting.canBook && (
              <p className="mb-3 text-sm text-amber-700">{t(blockedReasonKey)}</p>
            )}

            {meeting.slotMode === "SLOTS" ? (
              <div className="space-y-2">
                {meeting.slots.length === 0 && (
                  <p className="text-sm text-foreground/70">{t("slots.none")}</p>
                )}

                {meeting.slots.map((slot) => {
                  const slotIsActionable = !slot.isBooked && meeting.canBook;

                  return (
                    <div
                      key={slot.uuid}
                      className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {timeFormatter.format(new Date(slot.startTime))} -{" "}
                          {timeFormatter.format(new Date(slot.endTime))}
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
                          <p className="text-xs font-medium text-emerald-700">
                            {t("slots.bookedByYou")}
                          </p>
                          {meeting.canCancelMyRegistration &&
                          meeting.myRegistrationUuid ? (
                            <MeetingCancellationButton
                              meetingUuid={meeting.uuid}
                              registrationUuid={meeting.myRegistrationUuid}
                            />
                          ) : null}
                        </div>
                      ) : slot.isBooked ? (
                        <p className="text-xs font-medium text-foreground/70">
                          {t("slots.booked")}
                        </p>
                      ) : slotIsActionable ? (
                        <MeetingBookingButton
                          meetingUuid={meeting.uuid}
                          slotUuid={slot.uuid}
                          disabled={false}
                        />
                      ) : (
                        <p className="text-xs text-foreground/60">
                          {t("slots.notAvailableNow")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-border px-3 py-3">
                <p className="mb-2 text-sm text-foreground/80">{t("dayOnly.description")}</p>
                {meeting.myRegistrationUuid ? (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-sm font-medium text-emerald-700">
                      {t("dayOnly.bookedByYou")}
                    </p>
                    {meeting.canCancelMyRegistration ? (
                      <MeetingCancellationButton
                        meetingUuid={meeting.uuid}
                        registrationUuid={meeting.myRegistrationUuid}
                        className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    ) : null}
                  </div>
                ) : meeting.canBook ? (
                  <MeetingBookingButton meetingUuid={meeting.uuid} disabled={false} />
                ) : (
                  <p className="text-sm text-foreground/60">
                    {t("dayOnly.notAvailableNow")}
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
