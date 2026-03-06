// @file: apps/web/src/components/props/auth.ts
import type { Session } from "next-auth";

export type AuthNavProps = {
  locale: string;
  session: Session | null;
};
