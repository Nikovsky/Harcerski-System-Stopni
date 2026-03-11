// @file: apps/web/src/components/commission-review/CommissionMembershipChooser.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CommissionReviewMembership } from "@hss/schemas";

type Props = {
  locale: string;
  memberships: CommissionReviewMembership[];
};

function formatCommissionName(
  membership: CommissionReviewMembership,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  return (
    membership.commissionName ??
    t("membership.fallbackName", {
      type: membership.commissionType
        ? t(`types.${membership.commissionType}`)
        : t("types.UNKNOWN"),
    })
  );
}

export async function CommissionMembershipChooser({
  locale,
  memberships,
}: Props) {
  const t = await getTranslations("commission");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-border bg-gradient-to-br from-background via-background to-muted/50 p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">
          {t("membership.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {t("membership.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/65">
          {t("membership.description")}
        </p>
      </section>

      {memberships.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center">
          <h2 className="text-lg font-semibold">{t("membership.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-foreground/60">
            {t("membership.emptyDescription")}
          </p>
        </section>
      ) : (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {memberships.map((membership) => (
            <Link
              key={membership.commissionUuid}
              href={`/${locale}/commission/${membership.commissionUuid}`}
              className="group rounded-3xl border border-border bg-background p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/45">
                    {membership.commissionType
                      ? t(`types.${membership.commissionType}`)
                      : t("types.UNKNOWN")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    {formatCommissionName(membership, t)}
                  </h2>
                  <p className="mt-2 text-sm text-foreground/60">
                    {t("membership.roleLabel")}:{" "}
                    <span className="font-medium text-foreground">
                      {t(`roles.${membership.commissionRole}`)}
                    </span>
                  </p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {t("membership.openPanel")}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {membership.canManageWorkflow && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {t("permissions.manageWorkflow")}
                  </span>
                )}
                {membership.canDraftFixRequest && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    {t("permissions.fixRequests")}
                  </span>
                )}
                {!membership.canManageWorkflow && !membership.canDraftFixRequest && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/70">
                    {t("permissions.readReview")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
