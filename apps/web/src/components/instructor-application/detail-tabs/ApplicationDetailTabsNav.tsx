// @file: apps/web/src/components/instructor-application/detail-tabs/ApplicationDetailTabsNav.tsx
"use client";

import { useTranslations } from "next-intl";
import { stepKey } from "@/lib/applications-i18n";

const TABS = ["basicInfo", "serviceHistory", "supervisor", "requirements", "attachments"] as const;

export type ApplicationDetailTab = (typeof TABS)[number];

type Props = {
  tab: ApplicationDetailTab;
  onChange: (tab: ApplicationDetailTab) => void;
};

export function ApplicationDetailTabsNav({ tab, onChange }: Props) {
  const t = useTranslations("applications");

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto">
      {TABS.map((key) => {
        const translatedStepKey = stepKey(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`shrink-0 rounded-sm px-3 py-1.5 text-xs transition ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:bg-muted/80"
            }`}
          >
            {translatedStepKey ? t(translatedStepKey) : key}
          </button>
        );
      })}
    </div>
  );
}