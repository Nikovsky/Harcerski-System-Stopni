// @file: apps/web/src/app/[locale]/profile/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildKeycloakSignInHref, canAccess } from "@/server/rbac";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ProfileLayout({ children, params }: Props) {
  const { locale } = await params;
  const signInHref = buildKeycloakSignInHref(locale, `/${locale}/profile`);
  const session = await auth();

  if (!canAccess(session)) {
    redirect(signInHref);
  }

  return <>{children}</>;
}
