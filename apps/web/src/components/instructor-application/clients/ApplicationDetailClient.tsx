// @file: apps/web/src/components/instructor-application/clients/ApplicationDetailClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { degreeKey, statusKey } from "@/lib/applications-i18n";
import { ApplicationStatusBadge } from "@/components/instructor-application/ui/ApplicationStatusBadge";
import { RequirementForm } from "@/components/instructor-application/requirements/RequirementForm";
import {
  ApplicationDetailTabsNav,
  type ApplicationDetailTab,
} from "@/components/instructor-application/detail-tabs/ApplicationDetailTabsNav";
import {
  IA_BUTTON_PRIMARY_MD,
  IA_BUTTON_SECONDARY_MD,
} from "@/components/instructor-application/ui/button-classnames";
import { TabBasicInfo } from "@/components/instructor-application/detail-tabs/TabBasicInfo";
import { TabServiceHistory } from "@/components/instructor-application/detail-tabs/TabServiceHistory";
import { TabSupervisor } from "@/components/instructor-application/detail-tabs/TabSupervisor";
import { TabAttachments } from "@/components/instructor-application/detail-tabs/TabAttachments";
import { useApplicationPdfDownload } from "@/components/instructor-application/hooks/useApplicationPdfDownload";
import { isInstructorApplicationEditable } from "@hss/schemas";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { app: InstructorApplicationDetail; id: string };

export function ApplicationDetailClient({ app, id }: Props) {
  const t = useTranslations("applications");
  const locale = useLocale();
  const [tab, setTab] = useState<ApplicationDetailTab>("basicInfo");
  const { generatingPdf, pdfError, handleDownloadPdf } = useApplicationPdfDownload(app);

  const isEditable = isInstructorApplicationEditable(app.status);
  const canDownloadPdf = app.status !== "DRAFT";
  const translatedDegreeKey = degreeKey(app.template.degreeCode);
  const degreeTitle = translatedDegreeKey ? t(translatedDegreeKey) : app.template.degreeCode;
  const translatedStatusKey = statusKey(app.status);
  const statusLabel = translatedStatusKey ? t(translatedStatusKey) : app.status;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {degreeTitle}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <ApplicationStatusBadge status={app.status} label={statusLabel} />
            {app.lastSubmittedAt && (
              <span className="text-xs text-foreground/50">
                {t("lastSubmittedAt")}: {new Date(app.lastSubmittedAt).toLocaleDateString(locale)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {canDownloadPdf && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className={`${IA_BUTTON_SECONDARY_MD} disabled:opacity-50`}
            >
              {generatingPdf ? t("pdf.generatingPdf") : t("actions.downloadPdf")}
            </button>
          )}
          {isEditable && (
            <Link
              href={`/applications/${id}/edit`}
              className={IA_BUTTON_PRIMARY_MD}
            >
              {t("actions.edit")}
            </Link>
          )}
        </div>
      </div>

      {pdfError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{pdfError}</p>
      )}

      <ApplicationDetailTabsNav tab={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === "basicInfo" && <TabBasicInfo app={app} />}
      {tab === "serviceHistory" && <TabServiceHistory app={app} />}
      {tab === "supervisor" && <TabSupervisor app={app} />}
      {tab === "requirements" && (
        <RequirementForm applicationId={id} requirements={app.requirements} groupDefinitions={app.template.groupDefinitions} readOnly />
      )}
      {tab === "attachments" && <TabAttachments app={app} applicationId={id} />}
    </div>
  );
}
