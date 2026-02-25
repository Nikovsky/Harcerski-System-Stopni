// @file: apps/web/src/components/ui/Popup.tsx
"use client";

import React, { useEffect, useRef } from "react";

type PopupProps = {
  children: React.ReactNode;
  onClose: () => void;
  ariaLabel?: string;
};

export function Popup({ children, onClose, ariaLabel = "Popup dialog" }: PopupProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // focus for accessibility
    dialogRef.current?.focus();

    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={(e) => {
        // Close only when clicking the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          width: "min(560px, 100%)",
          background: "rgba(20,20,20,0.92)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => {
          // Prevent backdrop click-close when interacting inside.
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}
