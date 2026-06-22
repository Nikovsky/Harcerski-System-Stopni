// @file: apps/web/src/components/layout/NavbarLinks.tsx
"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavbarLinksProps } from "@/components/props/layout";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavbarLinks({ items, mobile = false }: NavbarLinksProps) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {items.map((item, index) => {
          const active = isActive(pathname, item.href);

          return (
            <Fragment key={item.href}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="h-4 w-px shrink-0 rounded-full bg-border"
                />
              ) : null}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative shrink-0 py-1 text-sm transition-colors",
                  "hover:text-foreground",
                  active ? "text-foreground" : "text-foreground/80",
                  active
                    ? "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent"
                    : "",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </Fragment>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-2 md:flex">
      {items.map((item, index) => {
        const active = isActive(pathname, item.href);

        return (
          <Fragment key={item.href}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="h-4 w-px shrink-0 rounded-full bg-border"
              />
            ) : null}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "relative py-1 text-sm transition-colors",
                "hover:text-foreground",
                active ? "text-foreground" : "text-foreground/80",
                active
                  ? "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent"
                  : "",
              ].join(" ")}
            >
              {item.label}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
