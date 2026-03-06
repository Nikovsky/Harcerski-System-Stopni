// @file: apps/web/src/components/meetings/MeetingCancellationButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ApiError, apiFetch } from "@/lib/api";

type Props = {
  meetingUuid: string;
  className?: string;
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
}: Props) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        aria-busy={isPending}
        className={
          className ??
          "rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isPending ? t("actions.cancelling") : t("actions.cancel")}
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
