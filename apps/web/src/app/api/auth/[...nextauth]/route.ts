// @file: apps/web/src/app/api/auth/[...nextauth]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handlers } from "@/auth";
import { envServer } from "@/config/env.server";
import { buildRateLimitKey, consumeRateLimit } from "@/server/rate-limit";
import {
  getClientIp,
  getOrCreateRequestId,
  rateLimitExceededResponse,
  requireTrustedHost,
} from "@/server/request-security";

const { GET: originalGET, POST: originalPOST } = handlers;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function enforceRouteSecurity(req: NextRequest): Promise<NextResponse | null> {
  const requestId = getOrCreateRequestId(req);
  const untrustedHost = requireTrustedHost(req, requestId);
  if (untrustedHost) return untrustedHost;

  try {
    const limit = await consumeRateLimit(
      buildRateLimitKey("auth-nextauth", getClientIp(req)),
      envServer.HSS_RATE_LIMIT_NEXTAUTH_MAX,
      envServer.HSS_RATE_LIMIT_NEXTAUTH_WINDOW_MS,
    );
    if (!limit.allowed) {
      return rateLimitExceededResponse(requestId);
    }
  } catch (error) {
    console.error("[nextauth] rate limit unavailable:", error);
    return serviceUnavailableResponse(requestId);
  }

  return null;
}

/**
 * F01 security fix: Strip accessToken from /api/auth/session response.
 * The BFF proxy uses auth() server-side and doesn't need the token exposed to the client.
 */
async function GET(req: NextRequest) {
  const securityResponse = await enforceRouteSecurity(req);
  if (securityResponse) return securityResponse;

  const res = await originalGET(req);

  if (new URL(req.url).pathname.endsWith("/session")) {
    const body = await res.json();
    delete body.accessToken;
    return new Response(JSON.stringify(body), {
      headers: res.headers,
      status: res.status,
    });
  }

  return res;
}

async function POST(req: NextRequest) {
  const securityResponse = await enforceRouteSecurity(req);
  if (securityResponse) return securityResponse;

  return originalPOST(req);
}

export { GET, POST };
