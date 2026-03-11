// @file: apps/web/src/app/[locale]/commission/[commissionUuid]/applications/[applicationUuid]/page.tsx
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { CommissionApplicationDetail } from "@/components/commission-review/CommissionApplicationDetail";
import {
  BffServerFetchError,
  bffServerFetchValidated,
} from "@/server/bff-fetch";
import {
  commissionReviewApplicationDetailSchema,
  commissionReviewMembershipListResponseSchema,
} from "@hss/schemas";

type Props = {
  params: Promise<{
    locale: string;
    commissionUuid: string;
    applicationUuid: string;
  }>;
};

export default async function CommissionApplicationDetailPage({ params }: Props) {
  const { locale, commissionUuid, applicationUuid } = await params;
  const tCommon = await getTranslations("common");
  const tCommission = await getTranslations("commission");
  const membershipsResponse = await bffServerFetchValidated(
    commissionReviewMembershipListResponseSchema,
    "commission-review/memberships",
  );
  const membership = membershipsResponse.memberships.find(
    (item) => item.commissionUuid === commissionUuid,
  );

  if (!membership) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{tCommon("nav.commission")}</h1>
        <AccessDenied
          code="403"
          codeLabel={tCommon("accessDenied.codeLabel", { code: "403" })}
          title={tCommon("accessDenied.title")}
          message={tCommission("accessDenied.applicationMessage")}
          actions={[
            { label: tCommon("nav.commission"), href: `/${locale}/commission` },
            {
              label: tCommission("detail.backToInbox"),
              href: `/${locale}/commission/${commissionUuid}`,
            },
          ]}
        />
      </main>
    );
  }

  if (membership.commissionType !== "INSTRUCTOR") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{tCommon("nav.commission")}</h1>
        <section className="mt-6 rounded-3xl border border-border bg-background p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">
            {tCommission("membership.eyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            {tCommission("unsupported.title")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-foreground/65">
            {tCommission("unsupported.detailDescription")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/${locale}/commission`}
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              {tCommission("unsupported.backToChooser")}
            </a>
          </div>
        </section>
      </main>
    );
  }

  try {
    const detail = await bffServerFetchValidated(
      commissionReviewApplicationDetailSchema,
      `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}`,
    );

    return (
      <CommissionApplicationDetail
        locale={locale}
        commissionUuid={commissionUuid}
        applicationUuid={applicationUuid}
        detail={detail}
      />
    );
  } catch (error: unknown) {
    if (error instanceof BffServerFetchError && error.status === 404) {
      notFound();
    }

    if (error instanceof BffServerFetchError && error.status === 403) {
      return (
        <main className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-2xl font-semibold">{tCommon("nav.commission")}</h1>
          <AccessDenied
            code="403"
            codeLabel={tCommon("accessDenied.codeLabel", { code: "403" })}
            title={tCommon("accessDenied.title")}
            message={tCommission("accessDenied.applicationMessage")}
            actions={[
              { label: tCommon("nav.commission"), href: `/${locale}/commission` },
              {
                label: tCommission("detail.backToInbox"),
                href: `/${locale}/commission/${commissionUuid}`,
              },
            ]}
          />
        </main>
      );
    }

    throw error;
  }
}
