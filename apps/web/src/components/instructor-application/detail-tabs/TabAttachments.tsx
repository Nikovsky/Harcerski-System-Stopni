// @file: apps/web/src/components/instructor-application/detail-tabs/TabAttachments.tsx
"use client";

import { useTranslations } from "next-intl";
import { AttachmentReadonlyList } from "@/components/instructor-application/attachments/AttachmentReadonlyList";
import { Section } from "@/components/instructor-application/detail-tabs/shared";
import type { AttachmentResponse, InstructorApplicationDetail } from "@hss/schemas";

type Props = {
  app: InstructorApplicationDetail;
  applicationId: string;
};

export function TabAttachments({ app, applicationId }: Props) {
  const t = useTranslations("applications");

  const hufcowyAttachments = app.hufcowyPresenceAttachmentUuid
    ? app.attachments.filter((a) => a.uuid === app.hufcowyPresenceAttachmentUuid)
    : [];
  const generalAttachments = app.attachments.filter(
    (a) => a.uuid !== app.hufcowyPresenceAttachmentUuid,
  );

  return (
    <div className="space-y-6">
      {hufcowyAttachments.length > 0 && (
        <Section title={t("sections.hufcowyWrittenOpinion")}>
          <AttachmentList
            applicationId={applicationId}
            attachments={hufcowyAttachments}
            viewLabel={t("actions.view")}
            downloadLabel={t("actions.download")}
          />
        </Section>
      )}
      <Section title={t("steps.attachments")}>
        {generalAttachments.length > 0 ? (
          <AttachmentList
            applicationId={applicationId}
            attachments={generalAttachments}
            viewLabel={t("actions.view")}
            downloadLabel={t("actions.download")}
          />
        ) : (
          <p className="text-sm text-foreground/40">{t("messages.noAttachments")}</p>
        )}
      </Section>
    </div>
  );
}

function AttachmentList({
  applicationId,
  attachments,
  viewLabel,
  downloadLabel,
}: {
  applicationId: string;
  attachments: AttachmentResponse[];
  viewLabel: string;
  downloadLabel: string;
}) {
  return (
    <AttachmentReadonlyList
      applicationId={applicationId}
      attachments={attachments}
      variant="detailed"
      viewLabel={viewLabel}
      downloadLabel={downloadLabel}
    />
  );
}
