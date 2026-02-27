// @file: apps/web/src/components/instructor-application/detail-tabs/TabSupervisor.tsx
"use client";

import { useTranslations } from "next-intl";
import { degreeKey } from "@/lib/applications-i18n";
import { FieldGrid, Section } from "@/components/instructor-application/detail-tabs/shared";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { app: InstructorApplicationDetail };

export function TabSupervisor({ app }: Props) {
  const t = useTranslations("applications");
  const supervisorRankKey = app.supervisorInstructorRank ? degreeKey(app.supervisorInstructorRank) : null;

  const rows: { label: string; value: string | null | undefined }[] = [
    {
      label: t("fields.supervisorFullName"),
      value: [app.supervisorFirstName, app.supervisorSurname].filter(Boolean).join(" ") || null,
    },
    {
      label: t("fields.supervisorInstructorRank"),
      value: app.supervisorInstructorRank ? (supervisorRankKey ? t(supervisorRankKey) : app.supervisorInstructorRank) : null,
    },
    { label: t("fields.supervisorInstructorFunction"), value: app.supervisorInstructorFunction },
  ];

  return (
    <Section title={t("steps.supervisor")}>
      <FieldGrid rows={rows} />
    </Section>
  );
}
