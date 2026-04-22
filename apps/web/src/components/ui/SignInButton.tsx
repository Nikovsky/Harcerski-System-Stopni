// @file: apps/web/src/components/ui/SignInButton.tsx
import { cookies, headers } from "next/headers";

import { forceReauthCookieName, signIn } from "@/auth";
import { envServer } from "@/config/env.server";
import type { SignInButtonProps } from "@/components/props/ui";
import { Button } from "./Button";

function normalizeUiLocale(locale: string): "pl" | "en" {
  return locale === "en" ? "en" : "pl";
}

function isTrustedActionRequest(
  originHeader: string | null,
  refererHeader: string | null,
): boolean {
  const allowedOrigin = envServer.HSS_WEB_ORIGIN;
  if (originHeader && originHeader !== "null") {
    return originHeader === allowedOrigin;
  }
  if (!refererHeader) return false;
  try {
    return new URL(refererHeader).origin === allowedOrigin;
  } catch {
    return false;
  }
}

export function SignInButton({ locale, label }: SignInButtonProps) {
  const uiLocale = normalizeUiLocale(locale);
  const isSecure = envServer.HSS_WEB_ORIGIN.startsWith("https://");

  return (
    <form
      action={async () => {
        "use server";
        const requestHeaders = await headers();
        const originHeader = requestHeaders.get("origin");
        const refererHeader = requestHeaders.get("referer");
        if (!isTrustedActionRequest(originHeader, refererHeader)) {
          return;
        }
        const jar = await cookies();
        const forceReauthOnce = jar.get(forceReauthCookieName)?.value === "1";
        if (forceReauthOnce) {
          jar.set(forceReauthCookieName, "", {
            httpOnly: true,
            sameSite: "lax",
            secure: isSecure,
            path: "/",
            maxAge: 0,
          });
        }
        await signIn("keycloak", undefined, {
          ui_locales: uiLocale,
          kc_locale: uiLocale,
          ...(forceReauthOnce ? { prompt: "login" } : {}),
        });
      }}
    >
      <Button type="submit">{label ?? "LOGIN"}</Button>
    </form>
  );
}
