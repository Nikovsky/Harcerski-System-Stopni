// @file: apps/web/src/components/instructor-application/ui/ApplicationCard.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { degreeKey, statusKey } from "@/lib/applications-i18n";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import {
  IA_BUTTON_PRIMARY_SM,
  IA_BUTTON_SECONDARY_SM,
} from "@/components/instructor-application/ui/button-classnames";
import { isInstructorApplicationEditable } from "@hss/schemas";
import type { InstructorApplicationListItem } from "@hss/schemas";

export function ApplicationCard({ app }: { app: InstructorApplicationListItem }) {
  const t = useTranslations("applications");
  const translatedDegreeKey = degreeKey(app.degreeCode);
  const translatedStatusKey = statusKey(app.status);
  const statusLabel = translatedStatusKey ? t(translatedStatusKey) : app.status;

  const isEditable = isInstructorApplicationEditable(app.status);

  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              {translatedDegreeKey ? t(translatedDegreeKey) : app.degreeCode}
            </h3>
            <ApplicationStatusBadge status={app.status} label={statusLabel} />
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            {t("createdAt")}: {new Date(app.createdAt).toLocaleDateString("pl-PL")}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditable ? (
            <Link
              href={`/applications/${app.uuid}/edit`}
              className={IA_BUTTON_PRIMARY_SM}
            >
              {t("actions.edit")}
            </Link>
          ) : (
            <Link
              href={`/applications/${app.uuid}`}
              className={IA_BUTTON_SECONDARY_SM}
            >
              {t("actions.view")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
