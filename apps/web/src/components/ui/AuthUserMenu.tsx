// @file: apps/web/src/components/ui/AuthUserMenu.tsx
"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "react-bootstrap-icons";
import type { AuthUserMenuProps } from "@/components/props/ui";
import { SessionRemainingBadge } from "./SessionRemainingBadge";
import { SignOutButton } from "./SignOutButton";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.tabIndex !== -1 &&
      element.getAttribute("aria-hidden") !== "true",
  );
}

export function AuthUserMenu({
  displayName,
  email,
  triggerLabel,
}: AuthUserMenuProps) {
  const t = useTranslations("common.authUserMenu");
  const menuId = useId();
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const focusInitialTarget = () => {
      const focusableElements = getFocusableElements(panelRef.current);
      const firstFocusable = focusableElements[0];

      if (firstFocusable) {
        firstFocusable.focus();
        return;
      }

      panelRef.current?.focus();
    };

    const animationFrameId = window.requestAnimationFrame(focusInitialTarget);

    function onDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onDocumentFocusIn(event: FocusEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(panelRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstFocusable || activeElement === panelRef.current) {
          event.preventDefault();
          lastFocusable.focus();
        }
        return;
      }

      if (activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("focusin", onDocumentFocusIn);
    document.addEventListener("keydown", onDocumentKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("focusin", onDocumentFocusIn);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="dialog"
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
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-modal="false"
          aria-label={t("ariaLabel")}
          aria-labelledby={headingId}
          tabIndex={-1}
          className="absolute right-0 z-90 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg"
        >
          <p
            id={headingId}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
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
