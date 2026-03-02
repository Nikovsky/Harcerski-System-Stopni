// @file: apps/web/src/app/api/auth/logout/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  authJwtDecode,
  authSessionCookieName,
  forceReauthCookieName,
} from "@/auth";
import { envServer } from "@/config/env.server";
import { buildRateLimitKey, consumeRateLimit } from "@/server/rate-limit";
import {
  getClientIp,
  getOrCreateRequestId,
  rateLimitExceededResponse,
  requireTrustedHost,
} from "@/server/request-security";
import { destroySessionBySid, normalizeSessionSidFromCookie } from "@/server/bff-session.store";

function getPublicOrigin(req: NextRequest): string {
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (xfProto && xfHost) return `${xfProto}://${xfHost}`;
  return req.nextUrl.origin;
}

function parseOriginFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function serviceUnavailableResponse(requestId: string): NextResponse {
  const res = NextResponse.json(
    {
      code: "SERVICE_UNAVAILABLE",
      message: "Service temporarily unavailable.",
      requestId,
    },
    { status: 503 },
  );
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

function expireCookie(name: string, secure: boolean): string {
  const parts = [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function setCookie(
  name: string,
  value: string,
  secure: boolean,
  maxAgeSeconds: number,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

const AUTH_COOKIE_PREFIXES = [
  "authjs.",
  "__Secure-authjs.",
  "__Host-authjs.",
  "next-auth.",
  "__Secure-next-auth.",
  "__Host-next-auth.",
];

function getAuthCookieNames(req: NextRequest): string[] {
  const names = new Set<string>();

  for (const cookie of req.cookies.getAll()) {
    if (AUTH_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix))) {
      names.add(cookie.name);
    }
  }

  names.add(authSessionCookieName);
  return [...names];
}

async function revokeKeycloakSession(params: {
  issuer: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  idToken?: string;
}): Promise<void> {
  const logoutUrl = `${params.issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`;

  const body: Record<string, string> = {
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
  };
  if (params.idToken) body.id_token_hint = params.idToken;

  const res = await fetch(logoutUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error(`[logout] Keycloak session revocation failed (${res.status}):`, txt.slice(0, 500));
  }
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const publicOrigin = getPublicOrigin(req);
  const canonicalAppOrigin = envServer.HSS_WEB_ORIGIN.replace(/\/$/, "");
  const appOrigin = canonicalAppOrigin || publicOrigin.replace(/\/$/, "");
  const isSecure = appOrigin.startsWith("https://");

  const token = (await getToken({
    req,
    secret: envServer.AUTH_SECRET,
    secureCookie: isSecure,
    cookieName: authSessionCookieName,
    decode: authJwtDecode,
  })) as
    | {
      refreshToken?: string;
      idToken?: string;
    }
    | null;

  const refreshToken = token?.refreshToken;
  const idToken = token?.idToken;

  if (refreshToken) {
    try {
      await revokeKeycloakSession({
        issuer: envServer.AUTH_KEYCLOAK_ISSUER,
        clientId: envServer.AUTH_KEYCLOAK_ID,
        clientSecret: envServer.AUTH_KEYCLOAK_SECRET,
        refreshToken,
        idToken,
      });
    } catch (error) {
      console.error("[logout] Keycloak revocation error:", error);
    }
  }

  const sidCookie = req.cookies.get(authSessionCookieName)?.value;
  const sid = normalizeSessionSidFromCookie(sidCookie);
  if (sid) {
    await destroySessionBySid(sid);
  }

  const cookiesToClear = getAuthCookieNames(req);
  const logoutReason = req.nextUrl.searchParams.get("reason");
  const shouldForceReauthOnce = logoutReason === "timeout";
  const redirectTo = `${appOrigin}/`;
  const html = [
    "<!DOCTYPE html>",
    "<html><head>",
    '<meta charset="utf-8">',
    `<meta http-equiv="refresh" content="0;url=${redirectTo}">`,
    "</head><body>",
    `<script>window.location.replace(${JSON.stringify(redirectTo)});</script>`,
    "<noscript>Redirecting&hellip;</noscript>",
    "</body></html>",
  ].join("");

  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  for (const name of cookiesToClear) {
    headers.append("Set-Cookie", expireCookie(name, isSecure));
  }
  if (shouldForceReauthOnce) {
    headers.append("Set-Cookie", setCookie(forceReauthCookieName, "1", isSecure, 300));
  }

  return new NextResponse(html, { status: 200, headers });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  try {
    const limit = await consumeRateLimit(
      buildRateLimitKey("auth-logout", getClientIp(req)),
      envServer.HSS_RATE_LIMIT_LOGOUT_MAX,
      envServer.HSS_RATE_LIMIT_LOGOUT_WINDOW_MS,
    );
    if (!limit.allowed) {
      return rateLimitExceededResponse(requestId);
    }
  } catch (error) {
    console.error("[logout] rate limit unavailable:", error);
    return serviceUnavailableResponse(requestId);
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowedOrigin = envServer.HSS_WEB_ORIGIN.replace(/\/$/, "");
  const requestOrigin = origin || parseOriginFromReferer(referer);

  if (!requestOrigin || !allowedOrigin || requestOrigin !== allowedOrigin) {
    console.warn("[logout] CSRF check failed:", { origin, referer, allowedOrigin });
    const res = NextResponse.json(
      { code: "FORBIDDEN", message: "Forbidden." },
      { status: 403 },
    );
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const res = await handler(req);
  res.headers.set("x-request-id", requestId);
  return res;
}
