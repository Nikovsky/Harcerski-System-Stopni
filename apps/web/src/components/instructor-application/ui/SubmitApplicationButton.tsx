// @file: apps/web/src/components/instructor-application/ui/SubmitApplicationButton.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import type { RequirementRowResponse } from "@hss/schemas";

export function SubmitApplicationButton({
  applicationId,
  requirements,
  pendingFixLabels = [],
}: {
  applicationId: string;
  requirements: RequirementRowResponse[];
  pendingFixLabels?: string[];
}) {
  const t = useTranslations("applications");
  const locale = useLocale();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [missingFields, setMissingFields] = useState<string[] | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = `submit-application-title-${applicationId}`;
  const descriptionId = `submit-application-description-${applicationId}`;
  const hasPendingFixes = pendingFixLabels.length > 0;

  useEffect(() => {
    if (!showConfirm) return;

    lastActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowConfirm(false);
        return;
      }
      if (event.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      lastActiveElementRef.current?.focus();
    };
  }, [showConfirm]);

  async function handleSubmit() {
    setIsPending(true);
    try {
      await apiFetch(`instructor-applications/${applicationId}/submit`, { method: "POST" });
      setShowConfirm(false);
      router.push(`/${locale}/applications`);
    } catch (err) {
      setShowConfirm(false);
      if (err instanceof ApiError && err.code === "APPLICATION_INCOMPLETE" && err.missingFields) {
        setMissingFields(err.missingFields);
        setGenericError(null);
      } else {
        setGenericError(t("messages.error"));
        setMissingFields(null);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (hasPendingFixes) {
            return;
          }
          setMissingFields(null);
          setGenericError(null);
          setShowConfirm(true);
        }}
        disabled={hasPendingFixes}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("actions.submit")}
      </button>

      {hasPendingFixes && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30"
        >
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            {t("messages.pendingFixesBeforeSubmit")}
          </p>
          <ul className="ml-4 list-disc text-sm text-amber-700 dark:text-amber-400">
            {pendingFixLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Generic error */}
      {genericError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{genericError}</p>
        </div>
      )}

      {/* Missing fields error */}
      {missingFields && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30"
        >
          <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-300">
            {t("messages.incompleteFields")}
          </p>
          <ul className="ml-4 list-disc text-sm text-red-700 dark:text-red-400">
            {missingFields.map((field) => {
              return <li key={field}>{getFieldLabel(field, t, requirements)}</li>;
            })}
          </ul>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
          >
            <h3 id={titleId} className="mb-2 text-lg font-semibold">{t("confirm.submitTitle")}</h3>
            <p id={descriptionId} className="mb-4 text-sm text-foreground/70">{t("confirm.submitMessage")}</p>
            <div className="flex justify-end gap-2">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {t("confirm.submitCancel")}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? "..." : t("confirm.submitConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
