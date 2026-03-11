// @file: apps/web/src/app/[locale]/commission/page.tsx
import { redirect } from "next/navigation";
import { CommissionMembershipChooser } from "@/components/commission-review/CommissionMembershipChooser";
import { bffServerFetchValidated } from "@/server/bff-fetch";
import { commissionReviewMembershipListResponseSchema } from "@hss/schemas";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CommissionLandingPage({ params }: Props) {
  const { locale } = await params;
  const response = await bffServerFetchValidated(
    commissionReviewMembershipListResponseSchema,
    "commission-review/memberships",
  );

  if (response.memberships.length === 1) {
    redirect(`/${locale}/commission/${response.memberships[0].commissionUuid}`);
  }

  return (
    <CommissionMembershipChooser
      locale={locale}
      memberships={response.memberships}
    />
  );
}
