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
    `${name}=`,
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

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
  const redirectUrl = new URL(returnTo, req.nextUrl.origin);
  return NextResponse.redirect(redirectUrl, { status: 302, headers });
}
