// @file: apps/web/src/components/layout/NavbarLinks.tsx
"use client";

import Link from "next/link";
import { usePathname } from "@/i18n/navigation";

export type NavbarLinkItem = {
  label: string;
  href: string;
};

type NavbarLinksProps = {
  items: NavbarLinkItem[];
  className?: string;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavbarLinks({ items, className }: NavbarLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "text-sm font-semibold text-foreground underline decoration-2 underline-offset-4"
                : "text-sm text-foreground/80 hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
