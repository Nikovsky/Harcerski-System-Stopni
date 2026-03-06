// @file: apps/web/src/components/ui/AuthUserMenu.tsx
"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "react-bootstrap-icons";
import type { AuthUserMenuProps } from "@/components/props/ui";
import { SessionRemainingBadge } from "./SessionRemainingBadge";
import { SignOutButton } from "./SignOutButton";

export function AuthUserMenu({
  displayName,
  email,
  triggerLabel,
}: AuthUserMenuProps) {
  const t = useTranslations("common.authUserMenu");
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2 text-foreground shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="max-w-44 truncate text-sm font-medium">{triggerLabel}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("ariaLabel")}
          className="absolute right-0 z-90 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("signedInAs")}
          </p>
          <p className="mt-2 truncate text-sm font-semibold text-foreground">
            {displayName}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{email}</p>

          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("session")}
            </p>
            <SessionRemainingBadge />
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <SignOutButton label={t("logout")} className="w-full justify-center" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
