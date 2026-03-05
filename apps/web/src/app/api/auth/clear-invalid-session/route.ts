// @file: apps/web/src/app/api/auth/clear-invalid-session/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authSessionCookieName } from "@/auth";
import { envServer } from "@/config/env.server";
import { destroySessionBySid, normalizeSessionSidFromCookie } from "@/server/bff-session.store";
import { getOrCreateRequestId, requireTrustedHost } from "@/server/request-security";

const AUTH_COOKIE_PREFIXES = [
  "authjs.",
  "__Secure-authjs.",
  "__Host-authjs.",
  "next-auth.",
  "__Secure-next-auth.",
  "__Host-next-auth.",
];

function expireCookie(name: string, secure: boolean): string {
  const parts = [
    name + "=",
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

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

function sanitizeReturnTo(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/api/auth/clear-invalid-session")) return "/";
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

function getRequestOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin;
  return parseOriginFromReferer(req.headers.get("referer"));
}

function isTrustedFetchContext(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite !== "same-origin") return false;

  const fetchMode = req.headers.get("sec-fetch-mode")?.trim().toLowerCase();
  if (fetchMode && fetchMode !== "navigate") return false;

  const fetchDest = req.headers.get("sec-fetch-dest")?.trim().toLowerCase();
  if (fetchDest && fetchDest !== "document" && fetchDest !== "empty") return false;

  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin && requestOrigin !== PUBLIC_ORIGIN) return false;

  return true;
}

function forbiddenNoStore(requestId: string): NextResponse {
  const res = NextResponse.json(
    {
      code: "FORBIDDEN",
      message: "Forbidden.",
      requestId,
    },
    { status: 403 },
  );
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PUBLIC_ORIGIN = envServer.HSS_WEB_ORIGIN.replace(/\/$/, "");

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  if (!isTrustedFetchContext(req)) {
    return forbiddenNoStore(requestId);
  }

  const isSecure = envServer.HSS_WEB_ORIGIN.startsWith("https://");
  const sidCookie = req.cookies.get(authSessionCookieName)?.value;
  const sid = normalizeSessionSidFromCookie(sidCookie);
  if (sid) {
    await destroySessionBySid(sid);
  }

  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.set("x-request-id", requestId);

  for (const name of getAuthCookieNames(req)) {
    headers.append("Set-Cookie", expireCookie(name, isSecure));
  }

  const returnTo = sanitizeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  const redirectUrl = new URL(returnTo, PUBLIC_ORIGIN);
  return NextResponse.redirect(redirectUrl, { status: 302, headers });
}
