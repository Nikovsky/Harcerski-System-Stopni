// @file: apps/web/src/app/[locale]/applications/layout.tsx
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccessDenied } from "@/components/ui/AccessDenied";
import {
  buildKeycloakSignInHref,
  canAccess,
  resolveVerifiedPrincipal,
} from "@/server/rbac";
import { ROLE_RANK } from "@hss/schemas";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ApplicationsLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("common");
  const signInHref = buildKeycloakSignInHref(locale, `/${locale}/applications`);
  const session = await auth();
  const resolvedPrincipal = await resolveVerifiedPrincipal(session);

  if (resolvedPrincipal.status === "unauthenticated") {
    redirect(signInHref);
  }

  if (resolvedPrincipal.status === "unavailable") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{t("nav.applications")}</h1>
        <AccessDenied
          code="503"
          codeLabel={t("accessDenied.codeLabel", { code: "503" })}
          title={t("accessDenied.serviceUnavailableTitle")}
          message={t("accessDenied.serviceUnavailableMessage")}
          actions={[
            { label: t("nav.home"), href: `/${locale}/` },
            { label: t("nav.profile"), href: `/${locale}/profile` },
          ]}
        />
      </main>
    );
  }

  if (!canAccess(resolvedPrincipal.principal, ROLE_RANK.USER)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{t("nav.applications")}</h1>
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
