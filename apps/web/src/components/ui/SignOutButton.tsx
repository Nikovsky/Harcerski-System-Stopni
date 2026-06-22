// @file: apps/web/src/components/ui/SignOutButton.tsx
"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { SignOutButtonProps } from "@/components/props/ui";
import { Button } from "./Button";
import { Popup } from "./Popup";

function resolveLocaleRoot(pathname: string | null): string {
  if (!pathname) {
    return "/pl";
  }

  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] === "en" ? "en" : "pl";
  return `/${locale}`;
}

export function SignOutButton({
  label,
  className = "",
}: SignOutButtonProps) {
  const t = useTranslations("common.signOutPopup");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const localeRoot = useMemo(() => resolveLocaleRoot(pathname), [pathname]);

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
      const logoutUrl = `/api/auth/logout?returnTo=${encodeURIComponent(localeRoot)}`;
      const res = await fetch(logoutUrl, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }

      window.location.href = localeRoot;
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
            "bg-red-700 text-white border-red-800",
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
          title={t("title")}
          disableClose={isLoggingOut}
          showCloseButton={!isLoggingOut}
          closeOnBackdropClick={!isLoggingOut}
          closeOnEscape={!isLoggingOut}
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
