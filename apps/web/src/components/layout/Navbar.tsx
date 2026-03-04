// @file: apps/web/src/components/layout/Navbar.tsx
import Link from "next/link";
import type { Session } from "next-auth";
import { ThemeControls } from "@/components/ui/ThemeControls";
import { AuthNav } from "@/components/ui/AuthNav";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { NavbarLinks } from "@/components/layout/NavbarLinks";

type NavItem = { label: string; href: string };
type NavbarProps = {
  locale: string;
  session: Session | null;
};

const NAV_BASE: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Docs", href: "/docs" },
];

export function Navbar({ locale, session }: NavbarProps) {
  const navItems: NavItem[] = session?.user
    ? [...NAV_BASE, { label: "Dashboard", href: "/dashboard" }]
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
