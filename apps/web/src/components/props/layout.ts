// @file: apps/web/src/components/props/layout.ts
import type { Session } from "next-auth";

export type NavItem = {
  label: string;
  href: string;
};

export type NavbarProps = {
  locale: string;
  session: Session | null;
};

export type NavbarLinksProps = {
  items: NavItem[];
  mobile?: boolean;
};
