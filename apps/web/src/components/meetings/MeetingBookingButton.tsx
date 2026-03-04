// @file: apps/web/src/components/meetings/MeetingBookingButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, apiFetch } from "@/lib/api";

type Props = {
  meetingUuid: string;
  slotUuid?: string;
  disabled: boolean;
  className?: string;
};

function mapBookingError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "SLOT_ALREADY_BOOKED":
      return "errors.slotAlreadyBooked";
    case "ALREADY_REGISTERED_FOR_MEETING":
      return "errors.alreadyRegistered";
    case "BOOKING_NOT_ALLOWED_STATUS":
      return "errors.bookingNotAllowedStatus";
    default:
      return fallback;
  }
}

export function MeetingBookingButton({
  meetingUuid,
  slotUuid,
  disabled,
  className,
}: Props) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setErrorMessage(t(key as "errors.generic"));
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
        aria-busy={isPending}
        className={
          className ??
          "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isPending ? t("actions.booking") : t("actions.book")}
      </button>
      {errorMessage && (
        <p
          role="alert"
          aria-live="assertive"
          className="max-w-xs text-right text-xs text-rose-700"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
