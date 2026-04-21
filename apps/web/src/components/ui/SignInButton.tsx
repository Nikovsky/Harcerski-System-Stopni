// @file: apps/web/src/components/ui/SignInButton.tsx
import { redirect } from "next/navigation";

import type { SignInButtonProps } from "@/components/props/ui";
import { buildKeycloakSignInHref } from "@/server/rbac";
import { Button } from "./Button";

function normalizeUiLocale(locale: string): "pl" | "en" {
  return locale === "en" ? "en" : "pl";
}

export function SignInButton({ locale, label }: SignInButtonProps) {
  const uiLocale = normalizeUiLocale(locale);
  const signInHref = buildKeycloakSignInHref(uiLocale, `/${uiLocale}`);

  return (
    <form
      action={async () => {
        "use server";
        redirect(signInHref);
      }}
    >
      <Button type="submit">{label ?? "LOGIN"}</Button>
    </form>
  );
}
