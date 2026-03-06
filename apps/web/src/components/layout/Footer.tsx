// @file: apps/web/src/components/layout/Footer.tsx
import { getTranslations } from "next-intl/server";
import { ThemeControls } from "@/components/ui/ThemeControls";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

export async function Footer() {
  const t = await getTranslations("common.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1">
        <p className="text-sm text-foreground/70">{t("license", { year })}</p>
        <div className="flex items-center gap-2">
          <ThemeControls />
          <LocaleSwitcher variant="full" />
        </div>
      </div>
    </footer>
  );
}
