// @file: apps/web/src/components/ui/AuthNav.tsx
import { auth } from "@/auth";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import { SessionRemainingBadge } from "./SessionRemainingBadge";

export async function AuthNav() {
  const session = await auth();

  if (!session?.user) {
    return <SignInButton />;
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
