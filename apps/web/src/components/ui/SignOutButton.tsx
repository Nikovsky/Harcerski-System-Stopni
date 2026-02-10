// @file: apps/web/src/components/ui/SignOutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Popup } from "./Popup";

export function SignOutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        className="bg-red-500 text-white border-red-600"
        onClick={() => setOpen(true)}
      >
        LOGOUT
      </Button>

      {open && (
        <Popup onClose={() => setOpen(false)} ariaLabel="Confirm logout">
          <div className="flex flex-col gap-4">
            <div className="text-lg font-semibold">Confirm logout</div>

            <div className="opacity-90">
              Are you sure you want to log out from the app and Keycloak SSO?
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>

              {/* Full logout (Keycloak + Auth.js cookies cleanup) */}
              <form method="post" action="/api/auth/logout">
                <Button className="bg-red-500 text-white border-red-600" type="submit">
                  LOGOUT
                </Button>
              </form>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}