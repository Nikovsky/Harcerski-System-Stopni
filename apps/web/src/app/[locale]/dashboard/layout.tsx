// @file: apps/web/src/app/[locale]/dashboard/layout.tsx
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccessDenied } from "@/components/ui/AccessDenied";
import {
  buildKeycloakSignInHref,
  canAccess,
  getVerifiedPrincipal,
} from "@/server/rbac";
import { ROLE_RANK } from "@hss/schemas";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("common");
  const signInHref = buildKeycloakSignInHref(locale, `/${locale}/dashboard`);
  const session = await auth();
  const principal = await getVerifiedPrincipal(session);

  if (!canAccess(principal)) {
    redirect(signInHref);
  }

  if (!canAccess(principal, ROLE_RANK.SCOUT)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{t("dashboardPage.title")}</h1>
        <AccessDenied
          code="403"
          codeLabel={t("accessDenied.codeLabel", { code: "403" })}
          title={t("accessDenied.title")}
          message={t("accessDenied.roleMessage")}
          actions={[
            { label: t("nav.home"), href: `/${locale}/` },
            { label: t("nav.profile"), href: `/${locale}/profile` },
          ]}
        />
      </main>
    );
  }

  return <>{children}</>;
}
