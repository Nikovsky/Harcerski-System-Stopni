// @file: apps/web/src/app/[locale]/commission/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { CommissionMembershipChooser } from "@/components/commission-review/CommissionMembershipChooser";
import {
  BffServerFetchError,
  bffServerFetchValidated,
} from "@/server/bff-fetch";
import { commissionReviewMembershipListResponseSchema } from "@hss/schemas";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const tCommission = await getTranslations({ locale, namespace: "commission" });

  return {
    title: tCommission("seo.landingTitle"),
    description: tCommission("seo.landingDescription"),
  };
}

function renderServiceUnavailable(
  locale: string,
  tCommon: Awaited<ReturnType<typeof getTranslations>>,
): React.ReactNode {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{tCommon("nav.commission")}</h1>
      <AccessDenied
        code="503"
        codeLabel={tCommon("accessDenied.codeLabel", { code: "503" })}
        title={tCommon("accessDenied.serviceUnavailableTitle")}
        message={tCommon("accessDenied.serviceUnavailableMessage")}
        actions={[
          { label: tCommon("nav.commission"), href: `/${locale}/commission` },
          { label: tCommon("nav.home"), href: `/${locale}/` },
        ]}
      />
    </main>
  );
}

export default async function CommissionLandingPage({ params }: Props) {
  const { locale } = await params;
  const tCommon = await getTranslations("common");
  let memberships!: Parameters<typeof CommissionMembershipChooser>[0]["memberships"];

  try {
    const response = await bffServerFetchValidated(
      commissionReviewMembershipListResponseSchema,
      "commission-review/memberships",
    );

    memberships = response.memberships;
  } catch (error: unknown) {
    if (
      error instanceof BffServerFetchError &&
      (error.status === 502 || error.status === 503)
    ) {
      return renderServiceUnavailable(locale, tCommon);
    }

    throw error;
  }

  if (memberships.length === 1) {
    redirect(`/${locale}/commission/${memberships[0].commissionUuid}`);
  }

  return <CommissionMembershipChooser locale={locale} memberships={memberships} />;
}
