// @file: apps/web/src/app/[locale]/applications/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { useTemplates } from "@/hooks/instructor-application/useTemplates";
import { apiFetch, ApiError } from "@/lib/api";

export default function NewApplicationPage() {
  const t = useTranslations("applications");
  const router = useRouter();
  const { data: templates, isLoading } = useTemplates();

  const createMutation = useMutation({
    mutationFn: (templateUuid: string) =>
      apiFetch<{ uuid: string }>("instructor-applications", {
        method: "POST",
        body: JSON.stringify({ templateUuid }),
      }),
    onSuccess: (data) => {
      router.push(`/applications/${data.uuid}/edit`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "APPLICATION_ALREADY_EXISTS" && err.existingUuid) {
        router.push(`/applications/${err.existingUuid}/edit`);
        return;
      }
      console.error("Create application error:", err);
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("selectTemplate")}</h1>

      {isLoading && <div className="py-12 text-center text-foreground/50">...</div>}

      {templates && (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <button
              key={tmpl.uuid}
              type="button"
              onClick={() => createMutation.mutate(tmpl.uuid)}
              disabled={createMutation.isPending}
              className="w-full rounded-lg border border-border p-4 text-left transition hover:border-primary hover:shadow-md disabled:opacity-50"
            >
              <h3 className="font-semibold">{tmpl.name}</h3>
              <p className="mt-1 text-sm text-foreground/60">
                {t(`degree.${tmpl.degreeCode}` as any)} (v{tmpl.version}) &middot;{" "}
                {tmpl.definitionsCount} {t("steps.requirements").toLowerCase()}
              </p>
              {tmpl.description && (
                <p className="mt-1 text-sm text-foreground/50">{tmpl.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
