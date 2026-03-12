// @file: apps/web/src/components/commission-review/CommissionWorkspaceTabs.tsx
import Link from "next/link";

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
  basePath: string;
  ariaLabel?: string;
};

export function CommissionWorkspaceTabs({
  tabs,
  activeTab,
  basePath,
  ariaLabel = "Commission workspace navigation",
}: Props) {
  return (
    <nav
      aria-label={ariaLabel}
      className="overflow-x-auto rounded-3xl border border-border bg-background/90 p-2 shadow-sm"
    >
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const href =
            tab.id === "application" ? basePath : `${basePath}?tab=${tab.id}`;

          return (
            <Link
              key={tab.id}
              href={href}
              prefetch={false}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
