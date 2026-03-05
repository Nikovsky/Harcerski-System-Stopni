// @file: apps/web/src/app/api/session/status/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { BffSessionStatusResponse } from "@hss/schemas";

import { envServer } from "@/config/env.server";
import { buildRateLimitKey, consumeRateLimit } from "@/server/rate-limit";
import {
  getClientIp,
  getOrCreateRequestId,
  rateLimitExceededResponse,
  requireTrustedHost,
} from "@/server/request-security";
import { normalizeSessionSidFromCookie, readSessionBySid } from "@/server/bff-session.store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceUnavailableResponse(requestId: string): NextResponse {
  return jsonNoStore(
    {
      code: "SERVICE_UNAVAILABLE",
      message: "Service temporarily unavailable.",
      requestId,
    },
    requestId,
    503,
  );
}

function jsonNoStore(body: unknown, requestId: string, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

function unauthenticatedPayload(requestId: string): BffSessionStatusResponse {
  return {
    authenticated: false,
    idleExpiresAt: null,
    absoluteExpiresAt: null,
    requestId,
  };
}

function hasUsableSessionToken(
  session: NonNullable<Awaited<ReturnType<typeof readSessionBySid>>>,
): boolean {
  if (session.token.error === "RefreshTokenExpired") return false;

  return typeof session.token.accessToken === "string" && session.token.accessToken.length > 0;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  try {
    const limit = await consumeRateLimit(
      buildRateLimitKey("session-status", getClientIp(req)),
      envServer.HSS_RATE_LIMIT_BFF_MAX,
      envServer.HSS_RATE_LIMIT_BFF_WINDOW_MS,
    );
    if (!limit.allowed) {
      return rateLimitExceededResponse(requestId);
    }
  } catch (error) {
    console.error("[session-status] rate limit unavailable:", error);
    return serviceUnavailableResponse(requestId);
  }

  const sidCookie = req.cookies.get(envServer.HSS_SESSION_COOKIE_NAME)?.value;
  const sid = normalizeSessionSidFromCookie(sidCookie);

  if (!sid) {
    return jsonNoStore(unauthenticatedPayload(requestId), requestId);
  }

  const session = await readSessionBySid(sid);
  if (!session || !hasUsableSessionToken(session)) {
    return jsonNoStore(unauthenticatedPayload(requestId), requestId);
  }

  const payload: BffSessionStatusResponse = {
    authenticated: true,
    idleExpiresAt: session.idleExpiresAt.toISOString(),
    absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
    requestId,
  };

  return jsonNoStore(payload, requestId);
}
