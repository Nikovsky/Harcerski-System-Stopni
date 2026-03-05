// @file: apps/web/src/app/api/auth/login/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { signIn } from "@/auth";
import { getOrCreateRequestId, requireTrustedHost } from "@/server/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(body: unknown, status: number, requestId: string): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  const locale = normalizeLocale(req.nextUrl.searchParams.get("locale"));
  const callbackPath = normalizeCallbackPath(req.nextUrl.searchParams.get("callbackPath"));

  try {
    const redirectUrl = await signIn(
      "keycloak",
      { redirect: false, redirectTo: callbackPath },
      { ui_locales: locale, kc_locale: locale },
    );

    const res = NextResponse.redirect(redirectUrl, { status: 302 });
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("x-request-id", requestId);
    return res;
  } catch (error) {
    console.error("[auth-login] signIn redirect failed", { requestId, error });
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
