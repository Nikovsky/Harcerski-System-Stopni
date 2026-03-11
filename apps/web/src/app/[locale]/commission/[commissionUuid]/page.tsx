// @file: apps/web/src/app/[locale]/commission/[commissionUuid]/page.tsx
import { getTranslations } from "next-intl/server";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { CommissionApplicationInbox } from "@/components/commission-review/CommissionApplicationInbox";
import {
  BffServerFetchError,
  bffServerFetchValidated,
} from "@/server/bff-fetch";
import {
  commissionReviewApplicationListQuerySchema,
  commissionReviewApplicationListResponseSchema,
  commissionReviewMembershipListResponseSchema,
} from "@hss/schemas";

type Props = {
  params: Promise<{ locale: string; commissionUuid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

function buildListPath(
  commissionUuid: string,
  query: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        params.append(key, value);
      }
      continue;
    }

    params.set(key, rawValue);
  }

  const search = params.toString();
  return search.length > 0
    ? `commission-review/commissions/${commissionUuid}/instructor-applications?${search}`
    : `commission-review/commissions/${commissionUuid}/instructor-applications`;
}

export default async function CommissionInboxPage({
  params,
  searchParams,
}: Props) {
  const { locale, commissionUuid } = await params;
  const rawSearchParams = await searchParams;
  const tCommon = await getTranslations("common");
  const tCommission = await getTranslations("commission");
  let membershipsResponse;
  try {
    membershipsResponse = await bffServerFetchValidated(
      commissionReviewMembershipListResponseSchema,
      "commission-review/memberships",
    );
  } catch (error: unknown) {
    if (
      error instanceof BffServerFetchError &&
      (error.status === 502 || error.status === 503)
    ) {
      return renderServiceUnavailable(locale, tCommon);
    }

    throw error;
  }

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
          message={tCommission("accessDenied.membershipMessage")}
          actions={[
            { label: tCommon("nav.commission"), href: `/${locale}/commission` },
            { label: tCommon("nav.home"), href: `/${locale}/` },
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
            {tCommission("unsupported.inboxDescription")}
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

  const query = commissionReviewApplicationListQuerySchema.parse(rawSearchParams);

  try {
    const response = await bffServerFetchValidated(
      commissionReviewApplicationListResponseSchema,
      buildListPath(commissionUuid, rawSearchParams),
    );

    return (
      <CommissionApplicationInbox
        locale={locale}
        commissionUuid={commissionUuid}
        membership={membership}
        query={query}
        response={response}
      />
    );
  } catch (error: unknown) {
    if (
      error instanceof BffServerFetchError &&
      (error.status === 502 || error.status === 503)
    ) {
      return renderServiceUnavailable(locale, tCommon);
    }

    if (error instanceof BffServerFetchError && error.status === 403) {
      return (
        <main className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-2xl font-semibold">{tCommon("nav.commission")}</h1>
          <AccessDenied
            code="403"
            codeLabel={tCommon("accessDenied.codeLabel", { code: "403" })}
            title={tCommon("accessDenied.title")}
            message={tCommission("accessDenied.membershipMessage")}
            actions={[
              { label: tCommon("nav.commission"), href: `/${locale}/commission` },
              { label: tCommon("nav.home"), href: `/${locale}/` },
            ]}
          />
        </main>
      );
    }

    throw error;
  }
}
