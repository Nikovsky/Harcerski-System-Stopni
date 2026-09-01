// @file: apps/web/src/components/props/auth.ts
import type { HssSession } from "@/auth";

export type AuthNavProps = {
  locale: string;
  session: HssSession | null;
};
