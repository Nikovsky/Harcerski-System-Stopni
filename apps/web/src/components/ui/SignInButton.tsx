// @file: apps/web/src/components/ui/SignInButton.tsx

import { cookies } from "next/headers"
import { forceReauthCookieName, signIn } from "@/auth"
import { envServer } from "@/config/env.server"
import { Button } from "./Button"

type SignInButtonProps = {
  locale: string
}

function normalizeUiLocale(locale: string): "pl" | "en" {
  return locale === "en" ? "en" : "pl"
}

export function SignInButton({ locale }: SignInButtonProps) {
  const uiLocale = normalizeUiLocale(locale)
  const isSecure = envServer.HSS_WEB_ORIGIN.startsWith("https://")

  return (
    <form
      action={async () => {
        "use server"
        const jar = await cookies()
        const forceReauthOnce = jar.get(forceReauthCookieName)?.value === "1"
        if (forceReauthOnce) {
          jar.set(forceReauthCookieName, "", {
            httpOnly: true,
            sameSite: "lax",
            secure: isSecure,
            path: "/",
            maxAge: 0,
          })
        }
        await signIn("keycloak", undefined, {
          ui_locales: uiLocale,
          kc_locale: uiLocale,
          ...(forceReauthOnce ? { prompt: "login" } : {}),
        })
      }}
    >
      <Button type="submit">LOGIN</Button>
    </form>
  )
}
