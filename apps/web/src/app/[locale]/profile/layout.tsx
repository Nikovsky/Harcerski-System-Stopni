// @file: apps/web/src/app/[locale]/profile/layout.tsx
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AccessDenied } from "@/components/ui/AccessDenied";
import {
  buildKeycloakSignInHref,
  resolveVerifiedPrincipal,
} from "@/server/rbac";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ProfileLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("common");
  const signInHref = buildKeycloakSignInHref(locale, `/${locale}/profile`);
  const session = await auth();
  const resolvedPrincipal = await resolveVerifiedPrincipal(session);

  if (resolvedPrincipal.status === "unauthenticated") {
    redirect(signInHref);
  }

  if (resolvedPrincipal.status === "unavailable") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{t("profilePage.title")}</h1>
        <AccessDenied
          code="503"
          codeLabel={t("accessDenied.codeLabel", { code: "503" })}
          title={t("accessDenied.serviceUnavailableTitle")}
          message={t("accessDenied.serviceUnavailableMessage")}
          actions={[
            { label: t("nav.home"), href: `/${locale}/` },
          ]}
        />
      </main>
    );
  }

  return <>{children}</>;
}
