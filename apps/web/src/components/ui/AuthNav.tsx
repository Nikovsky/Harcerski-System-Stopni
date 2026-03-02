// @file: apps/web/src/components/ui/AuthNav.tsx
import type { Session } from "next-auth";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import { SessionRemainingBadge } from "./SessionRemainingBadge";

type AuthNavProps = {
  locale: string;
  session: Session | null;
};

export function AuthNav({ locale, session }: AuthNavProps) {
  if (!session?.user) {
    return <SignInButton locale={locale} />;
  }

  const displayName =
    session.user.name ??
    session.user.email ??
    "User";

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <span>{displayName}</span>
      <SessionRemainingBadge />
      <SignOutButton />
    </div>
  );
}
