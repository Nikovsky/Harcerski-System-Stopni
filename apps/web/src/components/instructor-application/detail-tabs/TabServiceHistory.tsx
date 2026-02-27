// @file: apps/web/src/components/instructor-application/detail-tabs/TabServiceHistory.tsx
"use client";

import { useTranslations } from "next-intl";
import { Section } from "@/components/instructor-application/detail-tabs/shared";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { app: InstructorApplicationDetail };

export function TabServiceHistory({ app }: Props) {
  const t = useTranslations("applications");

  const rows = [
    { label: t("fields.functionsHistory"), value: app.functionsHistory },
    { label: t("fields.coursesHistory"), value: app.coursesHistory },
    { label: t("fields.campsHistory"), value: app.campsHistory },
    { label: t("fields.successes"), value: app.successes },
    { label: t("fields.failures"), value: app.failures },
  ];

  return (
    <Section title={t("steps.serviceHistory")}>
      <div className="space-y-5">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <p className="mb-1 text-xs font-medium text-foreground/50">{label}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {value || <span className="text-foreground/30">—</span>}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
