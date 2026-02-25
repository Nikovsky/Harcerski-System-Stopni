// @file: apps/web/src/components/ui/SignInButton.tsx

import { signIn } from "@/auth"
import { Button } from "./Button"

type SignInButtonProps = {
  locale: string
}

function normalizeUiLocale(locale: string): "pl" | "en" {
  return locale === "en" ? "en" : "pl"
}

export function SignInButton({ locale }: SignInButtonProps) {
  const uiLocale = normalizeUiLocale(locale)

  return (
    <form
      action={async () => {
        "use server"
        await signIn("keycloak", undefined, { ui_locales: uiLocale, kc_locale: uiLocale })
      }}
    >
      <Button type="submit">LOGIN</Button>
    </form>
  )
}
