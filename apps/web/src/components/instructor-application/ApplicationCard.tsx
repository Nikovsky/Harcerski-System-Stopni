// @file: apps/web/src/components/instructor-application/ApplicationCard.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import type { InstructorApplicationListItem } from "@hss/schemas";

export function ApplicationCard({ app }: { app: InstructorApplicationListItem }) {
  const t = useTranslations("applications");

  const isEditable = app.status === "DRAFT" || app.status === "TO_FIX";

  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              {t(`degree.${app.degreeCode}` as any)}
            </h3>
            <ApplicationStatusBadge status={app.status} />
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            {t("createdAt")}: {new Date(app.createdAt).toLocaleDateString("pl-PL")}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditable ? (
            <Link
              href={`/applications/${app.uuid}/edit`}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            >
              {t("actions.edit")}
            </Link>
          ) : (
            <Link
              href={`/applications/${app.uuid}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              {t("actions.view")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
