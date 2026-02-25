// @file: apps/web/src/components/instructor-application/SubmitApplicationButton.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSubmitApplication } from "@/hooks/instructor-application/useSubmitApplication";
import { ApiError } from "@/lib/api";

export function SubmitApplicationButton({ applicationId }: { applicationId: string }) {
  const t = useTranslations("applications");
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [missingFields, setMissingFields] = useState<string[] | null>(null);
  const mutation = useSubmitApplication(applicationId);

  async function handleSubmit() {
    try {
      await mutation.mutateAsync();
      setShowConfirm(false);
      router.push("/applications");
    } catch (err) {
      setShowConfirm(false);
      if (err instanceof ApiError && err.code === "APPLICATION_INCOMPLETE" && err.missingFields) {
        setMissingFields(err.missingFields);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setMissingFields(null); setShowConfirm(true); }}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        {t("actions.submit")}
      </button>

      {/* Missing fields error */}
      {missingFields && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30">
          <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-300">
            {t("messages.incompleteFields")}
          </p>
          <ul className="ml-4 list-disc text-sm text-red-700 dark:text-red-400">
            {missingFields.map((field) => (
              <li key={field}>{t(`fields.${field}` as any, { defaultValue: field })}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">{t("confirm.submitTitle")}</h3>
            <p className="mb-4 text-sm text-foreground/70">{t("confirm.submitMessage")}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {t("confirm.submitCancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {mutation.isPending ? "..." : t("confirm.submitConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
