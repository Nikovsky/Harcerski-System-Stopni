// @file: apps/web/src/app/[locale]/dashboard/page.tsx
import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const t = await getTranslations("common.dashboardPage");
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("description")}
      </p>
    </main>
  );
}
