// @file: apps/web/src/components/ui/SignInButton.tsx

import { signIn } from "@/auth"
import { Button } from "./Button"

export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("keycloak")
      }}
    >
      <Button type="submit">LOGIN</Button>
    </form>
  )
}