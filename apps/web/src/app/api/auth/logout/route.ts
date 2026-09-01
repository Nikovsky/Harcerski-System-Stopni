// @file: apps/web/src/app/api/auth/logout/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forceReauthCookieName } from "@/auth";
import { envServer } from "@/config/env.server";
import { copySetCookies, fetchAuthApi } from "@/server/auth-api.client";
import { buildRateLimitKey, consumeRateLimit } from "@/server/rate-limit";
import {
  getClientIp,
  getOrCreateRequestId,
  rateLimitExceededResponse,
  requireTrustedHost,
} from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/api/auth/logout")) return "/";
  return value;
}

function parseOriginFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function forceReauthCookie(secure: boolean): string {
  return [
    `${forceReauthCookieName}=1`,
    "Path=/",
    "Max-Age=300",
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

function serviceUnavailableResponse(requestId: string): NextResponse {
  const response = NextResponse.json(
    {
      code: "SERVICE_UNAVAILABLE",
      message: "Service temporarily unavailable.",
      requestId,
    },
    { status: 503 },
  );
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  try {
    const limit = await consumeRateLimit(
      buildRateLimitKey("auth-logout", getClientIp(req)),
      envServer.HSS_RATE_LIMIT_LOGOUT_MAX,
      envServer.HSS_RATE_LIMIT_LOGOUT_WINDOW_MS,
    );
    if (!limit.allowed) return rateLimitExceededResponse(requestId);
  } catch (error) {
    console.error("[logout] rate limit unavailable:", error);
    return serviceUnavailableResponse(requestId);
  }

  const requestOrigin =
    req.headers.get("origin") ??
    parseOriginFromReferer(req.headers.get("referer"));
  const allowedOrigin = new URL(envServer.HSS_WEB_ORIGIN).origin;
  if (requestOrigin !== allowedOrigin) {
    const response = NextResponse.json(
      { code: "FORBIDDEN", message: "Forbidden.", requestId },
      { status: 403 },
    );
    response.headers.set("cache-control", "no-store");
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const returnTo = sanitizeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  const callbackURL = new URL(returnTo, envServer.HSS_WEB_ORIGIN).toString();
  let authResponse: Response;
  try {
    authResponse = await fetchAuthApi(
      "/api/auth/sign-out",
      req.headers,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ callbackURL }),
      },
      requestId,
    );
  } catch (error) {
    console.error("[logout] auth API unavailable:", { requestId, error });
    return serviceUnavailableResponse(requestId);
  }
  const payload = (await authResponse
    .clone()
    .json()
    .catch(() => null)) as { url?: unknown } | null;
  const providerLogoutURL =
    typeof payload?.url === "string"
      ? payload.url
      : authResponse.headers.get("location");
  const redirectURL = providerLogoutURL ?? callbackURL;
  const response = NextResponse.redirect(redirectURL, { status: 303 });
  copySetCookies(authResponse.headers, response.headers);

  if (req.nextUrl.searchParams.get("reason") === "timeout") {
    response.headers.append(
      "set-cookie",
      forceReauthCookie(envServer.HSS_WEB_ORIGIN.startsWith("https://")),
    );
  }
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-request-id", requestId);
  return response;
}
