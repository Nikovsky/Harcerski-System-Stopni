// @file: apps/web/src/app/api/auth/[...all]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

async function enforceRouteSecurity(
  req: NextRequest,
): Promise<NextResponse | null> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  try {
    const limit = await consumeRateLimit(
      buildRateLimitKey("auth", getClientIp(req)),
      envServer.HSS_RATE_LIMIT_AUTH_MAX,
      envServer.HSS_RATE_LIMIT_AUTH_WINDOW_MS,
    );
    return limit.allowed ? null : rateLimitExceededResponse(requestId);
  } catch (error) {
    console.error("[better-auth-proxy] rate limit unavailable:", error);
    return serviceUnavailableResponse(requestId);
  }
}

async function proxy(req: NextRequest): Promise<Response> {
  const securityResponse = await enforceRouteSecurity(req);
  if (securityResponse) return securityResponse;

  const requestId = getOrCreateRequestId(req);
  const path = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : Buffer.from(await req.arrayBuffer());

  try {
    const upstream = await fetchAuthApi(
      path,
      req.headers,
      { method: req.method, body },
      requestId,
    );
    const headers = new Headers(upstream.headers);
    headers.delete("set-cookie");
    copySetCookies(upstream.headers, headers);
    headers.set("cache-control", "no-store");
    if (!headers.has("x-request-id")) headers.set("x-request-id", requestId);
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("[better-auth-proxy] upstream unavailable:", {
      requestId,
      error,
    });
    return serviceUnavailableResponse(requestId);
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  return proxy(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  return proxy(req);
}
