// @file: apps/web/src/components/meetings/MeetingCancellationButton.tsx
"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, apiFetch } from "@/lib/api";

type Props = {
  meetingUuid: string;
  className?: string;
  ariaLabel?: string;
};

function mapCancellationError(
  code: string | undefined,
  fallback: "errors.cancellationGeneric",
):
  | "errors.cancellationNotAllowedStatus"
  | "errors.cancellationDeadlinePassed"
  | "errors.cancellationNotFound"
  | "errors.cancellationGeneric" {
  switch (code) {
    case "MEETING_NOT_OPEN":
      return "errors.cancellationNotAllowedStatus";
    case "CANCELLATION_DEADLINE_PASSED":
      return "errors.cancellationDeadlinePassed";
    case "REGISTRATION_NOT_FOUND":
      return "errors.cancellationNotFound";
    default:
      return fallback;
  }
}

export function MeetingCancellationButton({
  meetingUuid,
  className,
  ariaLabel,
}: Props) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorId = useId();

  async function onCancel() {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await apiFetch(
        `meetings/${meetingUuid}/my-registration/cancel`,
        { method: "PATCH" },
      );
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const key = mapCancellationError(
          error.code,
          "errors.cancellationGeneric",
        );
        setErrorMessage(t(key));

        if (
          error.code === "REGISTRATION_NOT_FOUND" ||
          error.code === "MEETING_NOT_OPEN" ||
          error.code === "CANCELLATION_DEADLINE_PASSED"
        ) {
          router.refresh();
        }
      } else {
        setErrorMessage(t("errors.cancellationGeneric"));
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        aria-label={ariaLabel}
        aria-busy={isPending}
        aria-describedby={errorMessage ? errorId : undefined}
        className={
          className ??
          "rounded-md border border-rose-400/45 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-rose-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isPending ? t("actions.cancelling") : t("actions.cancel")}
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
