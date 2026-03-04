// @file: apps/web/src/components/ui/AuthNav.tsx
import { getTranslations } from "next-intl/server";
import type { AuthNavProps } from "@/components/props/auth";
import { SignInButton } from "./SignInButton";
import { AuthUserMenu } from "./AuthUserMenu";

export async function AuthNav({ locale, session }: AuthNavProps) {
  const t = await getTranslations("common.auth");

  if (!session?.user) {
    return <SignInButton locale={locale} label={t("login")} />;
  }

  const displayName = session.user.name ?? session.user.email ?? t("userFallback");
  const email = session.user.email ?? t("noEmail");
  const triggerLabel = session.user.email ?? displayName;

  return (
    <AuthUserMenu
      displayName={displayName}
      email={email}
      triggerLabel={triggerLabel}
    />
  );
}
