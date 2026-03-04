// @file: apps/web/src/components/instructor-application/detail-tabs/ApplicationDetailTabsNav.tsx
"use client";

import { useTranslations } from "next-intl";
import { stepKey } from "@/lib/applications-i18n";

const TABS = ["basicInfo", "serviceHistory", "supervisor", "requirements", "attachments"] as const;

export type ApplicationDetailTab = (typeof TABS)[number];

export function applicationDetailTabId(tab: ApplicationDetailTab): string {
  return `application-detail-tab-${tab}`;
}

export function applicationDetailPanelId(tab: ApplicationDetailTab): string {
  return `application-detail-panel-${tab}`;
}

type Props = {
  tab: ApplicationDetailTab;
  onChange: (tab: ApplicationDetailTab) => void;
};

export function ApplicationDetailTabsNav({ tab, onChange }: Props) {
  const t = useTranslations("applications");

  function focusTab(nextTab: ApplicationDetailTab) {
    const nextId = applicationDetailTabId(nextTab);
    const nextButton = document.getElementById(nextId);
    if (nextButton instanceof HTMLButtonElement) {
      nextButton.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label={t("a11y.detailTabsLabel")}
      className="mb-6 flex gap-1 overflow-x-auto"
    >
      {TABS.map((key, index) => {
        const translatedStepKey = stepKey(key);
        const selected = tab === key;
        return (
          <button
            id={applicationDetailTabId(key)}
            key={key}
            type="button"
            onClick={() => onChange(key)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                const next = TABS[(index + 1) % TABS.length];
                onChange(next);
                focusTab(next);
                return;
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                const prev = TABS[(index - 1 + TABS.length) % TABS.length];
                onChange(prev);
                focusTab(prev);
                return;
              }
              if (event.key === "Home") {
                event.preventDefault();
                const first = TABS[0];
                onChange(first);
                focusTab(first);
                return;
              }
              if (event.key === "End") {
                event.preventDefault();
                const last = TABS[TABS.length - 1];
                onChange(last);
                focusTab(last);
              }
            }}
            role="tab"
            aria-selected={selected}
            aria-controls={applicationDetailPanelId(key)}
            tabIndex={selected ? 0 : -1}
            className={`shrink-0 rounded-sm px-3 py-1.5 text-xs transition ${
              selected
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
