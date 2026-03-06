// @file: apps/web/src/components/layout/Navbar.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ThemeControls } from "@/components/ui/ThemeControls";
import { AuthNav } from "@/components/ui/AuthNav";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { NavbarLinks } from "@/components/layout/NavbarLinks";
import type { NavItem, NavbarProps } from "@/components/props/layout";
import { canAccess, resolveVerifiedPrincipal } from "@/server/rbac";
import { ROLE_RANK } from "@hss/schemas";

export async function Navbar({ locale, session }: NavbarProps) {
  const t = await getTranslations("common.nav");
  const resolvedPrincipal = await resolveVerifiedPrincipal(session);
  const principal = resolvedPrincipal.status === "authenticated"
    ? resolvedPrincipal.principal
    : null;
  const isAuthenticated = resolvedPrincipal.status === "authenticated";
  const canSeeApplications = canAccess(principal, ROLE_RANK.USER);
  const canSeeDashboard = canAccess(principal, ROLE_RANK.SCOUT);
  const NAV_BASE: NavItem[] = [
    { label: t("home"), href: "/" },
    { label: t("about"), href: "/about" },
  ];
  const navItems: NavItem[] = isAuthenticated
    ? [
      ...NAV_BASE,
      ...(canSeeApplications ? [{ label: t("applications"), href: "/applications" }] : []),
      ...(canSeeDashboard ? [{ label: t("dashboard"), href: "/dashboard" }] : []),
      { label: t("profile"), href: "/profile" },
    ]
    : NAV_BASE;

  return (
    <header className="sticky top-0 z-80 border-b border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            HSS
          </Link>

          <NavbarLinks items={navItems} />
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher variant="icon" />
          <ThemeControls variant="icon" />
          <AuthNav locale={locale} session={session} />
        </div>
      </div>

      {/* Mobile nav (simple) */}
      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <NavbarLinks items={navItems} mobile />
      </div>
    </header>
  );
}
