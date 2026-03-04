// @file: apps/web/src/components/ui/AuthNav.tsx
import type { Session } from "next-auth";
import { SignInButton } from "./SignInButton";
import { AuthUserMenu } from "./AuthUserMenu";

type AuthNavProps = {
  locale: string;
  session: Session | null;
};

export function AuthNav({ locale, session }: AuthNavProps) {
  if (!session?.user) {
    return <SignInButton locale={locale} />;
  }

  const displayName = session.user.name ?? session.user.email ?? "User";
  const email = session.user.email ?? "No email";
  const triggerLabel = session.user.email ?? displayName;

  return (
    <AuthUserMenu
      displayName={displayName}
      email={email}
      triggerLabel={triggerLabel}
    />
  );
}
