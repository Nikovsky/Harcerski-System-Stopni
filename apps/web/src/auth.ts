// @file: apps/web/src/auth.ts
import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { envServer } from "@/config/env.server";
import { fetchAuthApi } from "@/server/auth-api.client";

const nullableString = z.string().nullable();
const hssSessionSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    name: nullableString,
    email: nullableString,
    image: nullableString,
  }),
  expires: z.string().datetime(),
  idleExpiresAt: z.string().datetime(),
  absoluteExpiresAt: z.string().datetime(),
  accessToken: z.string().min(1).optional(),
  realmRoles: z.array(z.string()).optional(),
  clientRoles: z.array(z.string()).optional(),
  error: z.literal("RefreshTokenExpired").optional(),
});

const internalSessionResponseSchema = z.object({
  session: hssSessionSchema.nullable(),
});

export type HssSession = z.infer<typeof hssSessionSchema>;

const cookieBaseName = envServer.HSS_SESSION_COOKIE_NAME.replace(
  /^(?:__Host-|__Secure-)/,
  "",
);

export const authSessionCookieName = `__Secure-${cookieBaseName}`;
export const forceReauthCookieName = "hss_force_reauth_once";

export async function auth(): Promise<HssSession | null> {
  try {
    const requestHeaders = await headers();
    const response = await fetchAuthApi(
      "/internal/bff/auth/session",
      requestHeaders,
      { method: "GET" },
    );
    if (!response.ok) return null;

    const parsed = internalSessionResponseSchema.safeParse(
      (await response.json()) as unknown,
    );
    return parsed.success ? parsed.data.session : null;
  } catch {
    return null;
  }
}

export async function signIn(
  provider: string,
  callbackURL?: string,
  additionalParams?: Record<string, string>,
): Promise<never> {
  if (provider !== "keycloak") {
    throw new Error("Unsupported authentication provider.");
  }

  const params = new URLSearchParams();
  const locale = additionalParams?.ui_locales === "en" ? "en" : "pl";
  params.set("locale", locale);
  if (callbackURL) params.set("callbackPath", callbackURL);
  if (additionalParams?.prompt === "login") params.set("forceLogin", "1");
  redirect(`/api/auth/login?${params.toString()}`);
}
