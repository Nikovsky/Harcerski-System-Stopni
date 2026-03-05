// @file: apps/web/src/components/ui/Popup.tsx
"use client";

import { useEffect, useRef } from "react";
import { X } from "react-bootstrap-icons";
import type { PopupProps } from "@/components/props/ui";

export function Popup({
  children,
  onClose,
  ariaLabel = "Popup dialog",
  closeButtonAriaLabel = "Close popup",
  title,
  content,
  actions,
  disableClose = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
}: PopupProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isStructured =
    title !== undefined || content !== undefined || actions !== undefined;
  const canClose = !disableClose;
  const canCloseWithBackdrop = canClose && closeOnBackdropClick;
  const canCloseWithEscape = canClose && closeOnEscape;
  const shouldShowHeader = title !== undefined || (canClose && showCloseButton);
  const shouldShowCloseButton = canClose && showCloseButton;

  useEffect(() => {
    // focus for accessibility
    dialogRef.current?.focus();

    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && canCloseWithEscape) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [canCloseWithEscape, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={(e) => {
        // Close only when clicking the backdrop.
        if (e.target === e.currentTarget && canCloseWithBackdrop) onClose();
      }}
      className="fixed inset-0 z-20000 grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none"
        onClick={(e) => {
          // Prevent backdrop click-close when interacting inside.
          e.stopPropagation();
        }}
      >
        {isStructured ? (
          <div className="flex flex-col">
            {shouldShowHeader ? (
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-1">
                <div className="min-w-0 text-base font-semibold text-foreground">
                  {title}
                </div>

                {shouldShowCloseButton ? (
                  <button
                    type="button"
                    aria-label={closeButtonAriaLabel}
                    onClick={onClose}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            ) : null}

            {content !== undefined ? (
              <div className="px-5 py-4 text-sm leading-6 text-muted-foreground">
                {content}
              </div>
            ) : null}

            {actions !== undefined ? (
              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-1">
                {actions}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-4">{children}</div>
        )}
      </div>
    </div>
  );
}
