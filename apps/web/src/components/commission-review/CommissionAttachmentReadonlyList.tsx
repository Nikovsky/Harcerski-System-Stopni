// @file: apps/web/src/components/commission-review/CommissionAttachmentReadonlyList.tsx
"use client";

import { useTranslations } from "next-intl";
import { CommissionAttachmentDownloadLink } from "@/components/commission-review/CommissionAttachmentDownloadLink";
import type { AttachmentResponse } from "@hss/schemas";

type Props = {
  commissionUuid: string;
  applicationUuid: string;
  attachments: AttachmentResponse[];
  variant?: "compact" | "detailed";
};

export function CommissionAttachmentReadonlyList({
  commissionUuid,
  applicationUuid,
  attachments,
  variant = "compact",
}: Props) {
  const t = useTranslations("commission");

  if (variant === "detailed") {
    return (
      <ul className="space-y-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.uuid}
            className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{attachment.originalFilename}</p>
              <p className="text-xs text-foreground/40">
                {(attachment.sizeBytes / 1024).toFixed(0)} KB
              </p>
            </div>
            <div className="ml-4 flex shrink-0 gap-2 text-xs">
              <CommissionAttachmentDownloadLink
                commissionUuid={commissionUuid}
                applicationUuid={applicationUuid}
                attachment={attachment}
                showFilename={false}
                viewLabel={t("actions.view")}
                downloadLabel={t("actions.download")}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-0.5 text-xs text-foreground/60">
      {attachments.map((attachment) => (
        <li key={attachment.uuid}>
          <CommissionAttachmentDownloadLink
            commissionUuid={commissionUuid}
            applicationUuid={applicationUuid}
            attachment={attachment}
            viewLabel={t("actions.view")}
            downloadLabel={t("actions.download")}
          />
        </li>
      ))}
    </ul>
  );
}
