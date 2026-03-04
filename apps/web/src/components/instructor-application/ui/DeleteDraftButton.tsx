// @file: apps/web/src/components/instructor-application/ui/DeleteDraftButton.tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

type Props = {
  applicationId: string;
  mode?: "detail" | "list";
};

export function DeleteDraftButton({ applicationId, mode = "detail" }: Props) {
  const t = useTranslations("applications");
  const locale = useLocale();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await apiFetch(`instructor-applications/${applicationId}`, {
        method: "DELETE",
      });
      setShowConfirm(false);
      if (mode === "list") {
        router.refresh();
      } else {
        router.push(`/${locale}/applications`);
      }
    } catch (error) {
      const message = (() => {
        if (error instanceof ApiError) {
          if (error.code === "APPLICATION_NOT_DRAFT") {
            return t("messages.deleteOnlyDraft");
          }
          return error.message;
        }
        return t("messages.error");
      })();
      setErrorMessage(message);
      setShowConfirm(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setShowConfirm(true);
        }}
        disabled={isPending}
        className={
          mode === "list"
            ? "rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/30"
            : "rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/30"
        }
      >
        {t("actions.delete")}
      </button>

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            role="dialog"
            aria-modal="true"
            className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
          >
            <h3 className="mb-2 text-lg font-semibold">{t("confirm.deleteTitle")}</h3>
            <p className="mb-4 text-sm text-foreground/70">{t("confirm.deleteMessage")}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {t("confirm.deleteCancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "..." : t("confirm.deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
