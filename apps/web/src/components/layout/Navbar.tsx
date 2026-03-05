// @file: apps/web/src/components/layout/Navbar.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ThemeControls } from "@/components/ui/ThemeControls";
import { AuthNav } from "@/components/ui/AuthNav";

type NavItem = { label: string; href: string };
type AppTheme = "dark" | "light";
type NavbarProps = { locale: string; initialTheme: AppTheme };

export async function Navbar({ locale, initialTheme }: NavbarProps) {
  const t = await getTranslations("common");

  const nav: NavbarLinkItem[] = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.docs"), href: "/docs" },
    { label: t("nav.dashboard"), href: "/dashboard" },
    { label: t("nav.applications"), href: "/applications" },
    { label: t("nav.meetings"), href: "/meetings" },
  ];

  return (
    <header className="border-b border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            HSS
          </Link>

          <NavbarLinks items={nav} className="hidden items-center gap-4 md:flex" />
        </div>

        <div className="flex items-center gap-2">
          <ThemeControls initialTheme={initialTheme} />
          <AuthNav locale={locale} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <NavbarLinks items={nav} className="flex flex-wrap gap-3" />
      </div>
    </header>
  );
}
