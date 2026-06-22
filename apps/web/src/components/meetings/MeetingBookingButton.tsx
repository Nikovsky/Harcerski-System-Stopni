// @file: apps/web/src/components/meetings/MeetingBookingButton.tsx
"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, apiFetch } from "@/lib/api";

type Props = {
  meetingUuid: string;
  slotUuid?: string;
  disabled: boolean;
  className?: string;
  ariaLabel?: string;
};

type BookingErrorKey =
  | "errors.slotAlreadyBooked"
  | "errors.alreadyRegistered"
  | "errors.bookingNotAllowedStatus"
  | "errors.bookingNotAllowedApplicationType"
  | "blocked.MEETING_NOT_OPEN"
  | "errors.generic";

function mapBookingError(
  code: string | undefined,
  fallback: BookingErrorKey,
): BookingErrorKey {
  switch (code) {
    case "SLOT_ALREADY_BOOKED":
      return "errors.slotAlreadyBooked";
    case "ALREADY_REGISTERED_FOR_MEETING":
      return "errors.alreadyRegistered";
    case "BOOKING_NOT_ALLOWED_STATUS":
      return "errors.bookingNotAllowedStatus";
    case "BOOKING_NOT_ALLOWED_APPLICATION_TYPE":
      return "errors.bookingNotAllowedApplicationType";
    case "MEETING_NOT_OPEN":
      return "blocked.MEETING_NOT_OPEN";
    default:
      return fallback;
  }
}

export function MeetingBookingButton({
  meetingUuid,
  slotUuid,
  disabled,
  className,
  ariaLabel,
}: Props) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorId = useId();

  async function onBook() {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await apiFetch(`meetings/${meetingUuid}/registrations`, {
        method: "POST",
        body: JSON.stringify(slotUuid ? { slotUuid } : {}),
      });
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const key = mapBookingError(error.code, "errors.generic");
        setErrorMessage(t(key));
        if (error.code === "SLOT_ALREADY_BOOKED") {
          router.refresh();
        }
      } else {
        setErrorMessage(t("errors.generic"));
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onBook}
        disabled={disabled || isPending}
        aria-label={ariaLabel}
        aria-busy={isPending}
        aria-describedby={errorMessage ? errorId : undefined}
        className={
          className ??
          "rounded-md border border-primary/70 bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:border-primary/25 disabled:bg-primary/35 disabled:text-primary-foreground/75 disabled:hover:brightness-100"
        }
      >
        {isPending ? t("actions.booking") : t("actions.book")}
      </button>
      {errorMessage && (
        <p
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="max-w-xs rounded-md border border-rose-400/35 bg-rose-500/10 px-2.5 py-1.5 text-right text-xs text-foreground"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
