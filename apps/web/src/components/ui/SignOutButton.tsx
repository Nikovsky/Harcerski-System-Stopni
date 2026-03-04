// @file: apps/web/src/components/ui/SignOutButton.tsx
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { SignOutButtonProps } from "@/components/props/ui";
import { Button } from "./Button";
import { Popup } from "./Popup";

export function SignOutButton({
  label,
  className = "",
}: SignOutButtonProps) {
  const t = useTranslations("common.signOutPopup");
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const closePopup = () => {
    if (isLoggingOut) return;
    setOpen(false);
    setErrorMessage(null);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }

      window.location.href = "/";
    } catch {
      setIsLoggingOut(false);
      setErrorMessage(t("error"));
    }
  };

  return (
    <>
      <Button
        type="button"
        className={[
          "bg-red-500 text-white border-red-600",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          setOpen(true);
          setErrorMessage(null);
        }}
      >
        {label ?? t("logoutTrigger")}
      </Button>

      {open && (
        <Popup
          onClose={closePopup}
          ariaLabel={t("ariaLabel")}
          closeButtonAriaLabel={t("closeButtonAria")}
          title={t("title")}
          content={
            <div className="space-y-3">
              <p className="text-foreground">
                {isLoggingOut ? t("loggingOut") : t("message")}
              </p>
              {errorMessage ? (
                <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          }
          actions={
            isLoggingOut ? undefined : (
              <>
                <Button type="button" onClick={closePopup}>
                  {t("cancel")}
                </Button>
                <Button
                  colorClass="bg-red-600 text-white border-red-700"
                  type="button"
                  onClick={() => void handleLogout()}
                >
                  {t("logoutNow")}
                </Button>
              </>
            )
          }
        />
      )}
    </>
  );
}
