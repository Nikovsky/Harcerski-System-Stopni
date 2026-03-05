// @file: apps/web/src/app/api/auth/login/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { forceReauthCookieName } from "@/auth";
import { envServer } from "@/config/env.server";
import { getOrCreateRequestId, requireTrustedHost } from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeLocale(value: string | null): "pl" | "en" {
  return value === "en" ? "en" : "pl";
}

function normalizeCallbackPath(value: string | null): string {
  if (!value) return "/";

  const normalized = value.trim();
  if (!normalized.startsWith("/")) return "/";
  if (normalized.startsWith("//")) return "/";
  if (normalized.includes("\r") || normalized.includes("\n")) return "/";

  return normalized;
}

function jsonNoStore(body: unknown, status: number, requestId: string): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

function firstSetCookieValue(headers: Headers): string | null {
  const combined = headers.get("set-cookie");
  if (!combined) return null;
  return combined.split(", ")[0] ?? null;
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

function readSetCookieHeaders(headers: Headers): string[] {
  const source = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof source.getSetCookie === "function") {
    const values = source.getSetCookie();
    if (values.length > 0) return values;
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

async function fetchCsrfToken(locale: "pl" | "en"): Promise<{ token: string; cookie: string } | null> {
  const csrfUrl = new URL("/api/auth/csrf", envServer.HSS_WEB_ORIGIN);
  const csrfRes = await fetch(csrfUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "x-hss-auth-login-locale": locale,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });

  if (!csrfRes.ok) return null;

  const csrfCookie = firstSetCookieValue(csrfRes.headers);
  if (!csrfCookie) return null;

  const payload = (await csrfRes.json().catch(() => null)) as unknown;
  if (!payload || typeof payload !== "object") return null;
  const token = (payload as { csrfToken?: unknown }).csrfToken;
  if (typeof token !== "string" || !token.trim()) return null;

  return { token, cookie: csrfCookie };
}

function copyRedirectHeaders(source: Headers, target: Headers): void {
  const location = source.get("location");
  if (location) {
    target.set("location", location);
  }

  for (const headerValue of readSetCookieHeaders(source)) {
    target.append("set-cookie", headerValue);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  const locale = normalizeLocale(req.nextUrl.searchParams.get("locale"));
  const callbackPath = normalizeCallbackPath(req.nextUrl.searchParams.get("callbackPath"));
  const shouldForceReauthOnce = req.cookies.get(forceReauthCookieName)?.value === "1";
  const isSecure = envServer.HSS_WEB_ORIGIN.startsWith("https://");

  const callbackUrl = new URL(callbackPath, envServer.HSS_WEB_ORIGIN).toString();
  const signInUrl = new URL("/api/auth/signin/keycloak", envServer.HSS_WEB_ORIGIN);
  signInUrl.searchParams.set("ui_locales", locale);
  signInUrl.searchParams.set("kc_locale", locale);
  if (shouldForceReauthOnce) {
    signInUrl.searchParams.set("prompt", "login");
  }

  try {
    const csrf = await fetchCsrfToken(locale);
    if (!csrf) {
      return jsonNoStore(
        {
          code: "SERVICE_UNAVAILABLE",
          message: "Unable to start login flow.",
          requestId,
        },
        503,
        requestId,
      );
    }

    const body = new URLSearchParams({
      csrfToken: csrf.token,
      callbackUrl,
    });

    const signInRes = await fetch(signInUrl, {
      method: "POST",
      body,
      cache: "no-store",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: csrf.cookie,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    if (![302, 303].includes(signInRes.status)) {
      return jsonNoStore(
        {
          code: "SERVICE_UNAVAILABLE",
          message: "Unable to start login flow.",
          requestId,
        },
        503,
        requestId,
      );
    }

    const location = signInRes.headers.get("location");
    if (!location) {
      return jsonNoStore(
        {
          code: "SERVICE_UNAVAILABLE",
          message: "Unable to start login flow.",
          requestId,
        },
        503,
        requestId,
      );
    }

    const res = new NextResponse(null, { status: 302 });
    copyRedirectHeaders(signInRes.headers, res.headers);
    res.headers.set("location", location);
    if (shouldForceReauthOnce) {
      res.headers.append("set-cookie", setCookie(forceReauthCookieName, "", isSecure, 0));
    }
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("x-request-id", requestId);
    return res;
  } catch (error) {
    console.error("[auth-login] failed to start login flow:", { requestId, error });
    return jsonNoStore(
      {
        code: "SERVICE_UNAVAILABLE",
        message: "Unable to start login flow.",
        requestId,
      },
      503,
      requestId,
    );
  }
}
