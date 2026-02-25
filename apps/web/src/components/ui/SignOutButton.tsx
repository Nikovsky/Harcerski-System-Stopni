// @file: apps/web/src/components/ui/SignOutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Popup } from "./Popup";

export function SignOutButton() {
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
      setErrorMessage("Nie udało się wylogować. Spróbuj ponownie.");
    }
  };

  return (
    <>
      <Button
        type="button"
        className="bg-red-500 text-white border-red-600"
        onClick={() => {
          setOpen(true);
          setErrorMessage(null);
        }}
      >
        LOGOUT
      </Button>

      {open && (
        <Popup onClose={closePopup} ariaLabel="Wylogowanie">
          <div className="flex flex-col gap-4">
            <div className="text-lg font-semibold">WYLOGOWANIE</div>

            {isLoggingOut ? (
              <div className="opacity-90">Wylogowywanie...</div>
            ) : (
              <div className="opacity-90">
                Czy na pewno chcesz się wylogować z aplikacji?
              </div>
            )}

            {errorMessage && (
              <div className="rounded-md border border-red-400/60 bg-red-500/20 px-3 py-2 text-sm text-red-100">
                {errorMessage}
              </div>
            )}

            {!isLoggingOut && (
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" onClick={closePopup}>
                  Anuluj
                </Button>

                <Button
                  className="bg-red-500 text-white border-red-600"
                  type="button"
                  onClick={() => void handleLogout()}
                >
                  Wyloguj teraz
                </Button>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
