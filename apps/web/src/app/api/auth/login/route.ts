// @file: apps/web/src/app/api/auth/login/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forceReauthCookieName } from "@/auth";
import { envServer } from "@/config/env.server";
import { copySetCookies, fetchAuthApi } from "@/server/auth-api.client";
import {
  getOrCreateRequestId,
  rateLimitExceededResponse,
  requireTrustedHost,
} from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeLocale(value: string | null): "pl" | "en" {
  return value === "en" ? "en" : "pl";
}

function normalizeCallbackPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\r") || value.includes("\n")) return "/";
  return value;
}

function clearCookie(name: string): string {
  return [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    ...(envServer.HSS_WEB_ORIGIN.startsWith("https://") ? ["Secure"] : []),
  ].join("; ");
}

function unavailable(requestId: string): NextResponse {
  const response = NextResponse.json(
    {
      code: "SERVICE_UNAVAILABLE",
      message: "Unable to start login flow.",
      requestId,
    },
    { status: 503 },
  );
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  const locale = normalizeLocale(req.nextUrl.searchParams.get("locale"));
  const callbackPath = normalizeCallbackPath(
    req.nextUrl.searchParams.get("callbackPath"),
  );
  const callbackURL = new URL(
    callbackPath,
    envServer.HSS_WEB_ORIGIN,
  ).toString();
  const forceLogin =
    req.cookies.get(forceReauthCookieName)?.value === "1" ||
    req.nextUrl.searchParams.get("forceLogin") === "1";

  try {
    const authResponse = await fetchAuthApi(
      "/api/auth/sign-in/social",
      req.headers,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "keycloak",
          callbackURL,
          additionalParams: {
            ui_locales: locale,
            kc_locale: locale,
            ...(forceLogin ? { prompt: "login" } : {}),
          },
        }),
      },
      requestId,
    );
    if (authResponse.status === 429) {
      const response = rateLimitExceededResponse(requestId);
      const retryAfter = authResponse.headers.get("retry-after");
      if (retryAfter && /^\d+$/.test(retryAfter)) {
        response.headers.set("retry-after", retryAfter);
      }
      return response;
    }
    if (!authResponse.ok) {
      console.error("[auth-login] auth API rejected login flow:", {
        requestId,
        status: authResponse.status,
      });
      return unavailable(requestId);
    }
    const payload = (await authResponse
      .clone()
      .json()
      .catch(() => null)) as { url?: unknown } | null;
    if (typeof payload?.url !== "string") return unavailable(requestId);

    const response = NextResponse.redirect(payload.url, { status: 302 });
    copySetCookies(authResponse.headers, response.headers);
    if (forceLogin) {
      response.headers.append("set-cookie", clearCookie(forceReauthCookieName));
    }
    response.headers.set("cache-control", "no-store");
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    console.error("[auth-login] failed to start login flow:", {
      requestId,
      error,
    });
    return unavailable(requestId);
  }
}
