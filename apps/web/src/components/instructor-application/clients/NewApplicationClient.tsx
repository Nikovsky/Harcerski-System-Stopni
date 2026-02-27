// @file: apps/web/src/components/instructor-application/clients/NewApplicationClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import { degreeKey } from "@/lib/applications-i18n";
import type { RequirementTemplateListItem } from "@hss/schemas";

type Props = { templates: RequirementTemplateListItem[] };

export function NewApplicationClient({ templates }: Props) {
  const t = useTranslations("applications");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleCreate(templateUuid: string) {
    setIsPending(true);
    try {
      const data = await apiFetch<{ uuid: string }>("instructor-applications", {
        method: "POST",
        body: JSON.stringify({ templateUuid }),
      });
      router.push(`/${locale}/applications/${data.uuid}/edit`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "APPLICATION_ALREADY_EXISTS" && err.existingUuid) {
        router.push(`/${locale}/applications/${err.existingUuid}/edit`);
        return;
      }
      console.error("Create application error:", err);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("selectTemplate")}</h1>

      <div className="space-y-3">
        {templates.map((tmpl) => {
          const translatedDegreeKey = degreeKey(tmpl.degreeCode);
          return (
            <button
              key={tmpl.uuid}
              type="button"
              onClick={() => handleCreate(tmpl.uuid)}
              disabled={isPending}
              className="w-full rounded-lg border border-border p-4 text-left transition hover:border-primary hover:shadow-md disabled:opacity-50"
            >
              <h3 className="font-semibold">{tmpl.name}</h3>
              <p className="mt-1 text-sm text-foreground/60">
                {translatedDegreeKey ? t(translatedDegreeKey) : tmpl.degreeCode} (v{tmpl.version}) &middot;{" "}
                {tmpl.definitionsCount} {t("steps.requirements").toLowerCase()}
              </p>
              {tmpl.description && (
                <p className="mt-1 text-sm text-foreground/50">{tmpl.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
