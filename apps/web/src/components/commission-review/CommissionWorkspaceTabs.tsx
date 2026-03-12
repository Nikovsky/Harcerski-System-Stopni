// @file: apps/web/src/components/commission-review/CommissionWorkspaceTabs.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type CommissionWorkspaceTabId =
  | "application"
  | "requirements"
  | "candidateFeedback"
  | "internalNotes"
  | "history";

export type CommissionWorkspaceTab = {
  id: CommissionWorkspaceTabId;
  label: string;
  badge?: number;
};

type Props = {
  tabs: CommissionWorkspaceTab[];
  activeTab: CommissionWorkspaceTabId;
  ariaLabel?: string;
};

export function CommissionWorkspaceTabs({
  tabs,
  activeTab,
  ariaLabel = "Commission workspace navigation",
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(tabId: CommissionWorkspaceTabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="overflow-x-auto rounded-3xl border border-border bg-background/90 p-2 shadow-sm"
    >
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground/75 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-muted text-foreground/75"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
