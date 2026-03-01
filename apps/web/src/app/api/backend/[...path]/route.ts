// @file: apps/web/src/app/api/backend/[...path]/route.ts
import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { BffErrorCode, BffErrorResponse } from "@hss/schemas";

import { auth } from "@/auth";
import { envServer } from "@/config/env.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEBUG_BFF = envServer.DEBUG_BFF && envServer.NODE_ENV !== "production";

function dlog(...args: unknown[]) {
  if (DEBUG_BFF) console.log("[BFF]", ...args);
}

function jsonNoStore(body: unknown, status: number, requestId?: string) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  if (requestId) res.headers.set("x-request-id", requestId);
  return res;
}

function errorNoStore(status: number, code: BffErrorCode, message: string, requestId: string) {
  const payload: BffErrorResponse = { code, message, requestId };
  return jsonNoStore(payload, status, requestId);
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const PUBLIC_BACKEND_PATHS = new Set(["health"]);

function isPublicBackendRequest(method: string, pathParts: string[]): boolean {
  const m = method.toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  return pathParts.length === 1 && PUBLIC_BACKEND_PATHS.has(pathParts[0] ?? "");
}

function apiOriginFromEnv(): string {
  // Prefer the validated env, allow legacy fallback for convenience
  const raw = envServer.HSS_API_BASE_URL ?? process.env.API_URL ?? "";
  if (!raw) throw new Error("Missing HSS_API_BASE_URL (or API_URL) env");
  return raw.replace(/\/$/, "");
}

function buildUpstreamUrl(req: NextRequest, pathParts: string[]): URL {
  const origin = apiOriginFromEnv();
  const safePath = pathParts.map((p) => encodeURIComponent(p)).join("/");
  const url = new URL(`${origin}/${safePath}`);
  url.search = req.nextUrl.search;
  return url;
}

function buildUpstreamHeaders(req: NextRequest, accessToken: string | undefined, requestId: string): Headers {
  const headers = new Headers(req.headers);

  // Never forward browser cookies to the API
  headers.delete("cookie");

  // Force our Authorization
  headers.delete("authorization");
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  // Avoid mismatches (fetch will compute content-length)
  headers.delete("content-length");

  for (const h of HOP_BY_HOP) headers.delete(h);
  headers.delete("host");

  // Preserve forwarding info (prefer explicit x-forwarded from proxy)
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host");

  if (xfProto) headers.set("x-forwarded-proto", xfProto);
  if (xfHost) headers.set("x-forwarded-host", xfHost);
  headers.set("x-request-id", requestId);

  return headers;
}

function filterDownstreamHeaders(upstream: Response): Headers {
  const headers = new Headers(upstream.headers);

  // Never let upstream set cookies through the BFF
  headers.delete("set-cookie");

  for (const h of HOP_BY_HOP) headers.delete(h);

  headers.set("cache-control", "no-store");
  return headers;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getRequestOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (origin) return origin;

  const referer = req.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function enforceSameOriginCsrf(req: NextRequest, requestId: string): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!MUTATING_METHODS.has(method)) return null;

  const allowedOrigin = new URL(envServer.HSS_WEB_ORIGIN).origin;
  const requestOrigin = getRequestOrigin(req);

  if (!requestOrigin || requestOrigin !== allowedOrigin) {
    dlog("csrf check failed", { method, requestOrigin, allowedOrigin, requestId });
    return errorNoStore(403, "FORBIDDEN", "Forbidden.", requestId);
  }

  return null;
}

async function readRequestBody(req: NextRequest): Promise<ArrayBuffer | undefined> {
  const m = req.method.toUpperCase();
  if (m === "GET" || m === "HEAD") return undefined;

  const len = req.headers.get("content-length");
  if (len === "0") return undefined;

  try {
    return await req.arrayBuffer();
  } catch {
    return undefined;
  }
}

// IMPORTANT: in newer Next versions params may be async (Promise)
type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const incomingRequestId = req.headers.get("x-request-id")?.trim();
  const requestId = incomingRequestId || randomUUID();
  const csrfFailure = enforceSameOriginCsrf(req, requestId);
  if (csrfFailure) return csrfFailure;

  // ✅ params can be a Promise -> always await (await on non-promise is fine)
  const { path = [] } = await ctx.params;
  const isPublicRequest = isPublicBackendRequest(req.method, path);

  let accessToken: string | undefined;
  if (!isPublicRequest) {
    // auth() triggers the full JWT callback chain — including silent token refresh.
    const session = await auth();
    accessToken = session?.accessToken;

    dlog("auth context:", {
      hasSession: !!session,
      userId: session?.user?.id,
      hasAccessToken: !!accessToken,
      error: session?.error,
      requestId,
    });

    if (!accessToken) {
      return session?.error === "RefreshTokenExpired"
        ? errorNoStore(401, "SESSION_EXPIRED", "Session expired. Please log in again.", requestId)
        : errorNoStore(401, "AUTHENTICATION_REQUIRED", "Authentication required.", requestId);
    }
  } else {
    dlog("public route passthrough:", { method: req.method, path: path.join("/"), requestId });
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = buildUpstreamUrl(req, path);
  } catch (e) {
    dlog("upstream url build error:", String(e));
    return errorNoStore(
      500,
      "SERVER_MISCONFIGURED",
      "Server misconfigured (HSS_API_BASE_URL).",
      requestId,
    );
  }

  const upstreamHeaders = buildUpstreamHeaders(req, accessToken, requestId);
  const body = await readRequestBody(req);

  try {
    dlog("upstream url:", upstreamUrl.toString());

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: body ? Buffer.from(body) : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    dlog("upstream response:", {
      status: upstreamRes.status,
      wwwAuthenticate: upstreamRes.headers.get("www-authenticate"),
    });

    if (upstreamRes.status === 401 || upstreamRes.status === 403) {
      const text = await upstreamRes.clone().text();
      dlog("upstream error body (first 1000 chars):", text.slice(0, 1000));
    }

    const downstreamHeaders = filterDownstreamHeaders(upstreamRes);
    if (!downstreamHeaders.get("x-request-id")) {
      downstreamHeaders.set("x-request-id", requestId);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: downstreamHeaders,
    });
  } catch (e) {
    dlog("fetch upstream failed:", String(e));
    return errorNoStore(502, "BAD_GATEWAY", "Bad gateway.", requestId);
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handle(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return handle(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handle(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handle(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handle(req, ctx);
}
export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return handle(req, ctx);
}
