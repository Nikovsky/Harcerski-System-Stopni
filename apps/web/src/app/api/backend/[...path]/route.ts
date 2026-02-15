// @file: apps/web/src/app/api/backend/[...path]/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { auth } from "@/auth";
import { envServer } from "@/config/env.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Compute the public origin reliably behind reverse proxies.
 * (req.nextUrl.origin may be internal like http://localhost:3000)
 */
function getPublicOrigin(req: NextRequest): string {
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (xfProto && xfHost) return `${xfProto}://${xfHost}`;
  return req.nextUrl.origin;
}

const DEBUG_BFF = envServer.DEBUG_BFF && envServer.NODE_ENV !== "production";

function dlog(...args: any[]) {
  if (DEBUG_BFF) console.log("[BFF]", ...args);
}

function jsonNoStore(body: any, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function decodeJwtClaims(jwt: string): any {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Read and decode the Auth.js session JWT directly from cookies.
 *
 * This bypasses the session callback, giving direct access to the full JWT
 * (including accessToken) without exposing it to the client via /api/auth/session.
 */
async function readSessionJwt(
  req: NextRequest,
  secret: string,
  isSecure: boolean,
): Promise<Record<string, unknown> | null> {
  // We always try both secure + non-secure names; order just prefers the expected variant.
  const baseNames = isSecure
    ? ["__Secure-authjs.session-token", "authjs.session-token"]
    : ["authjs.session-token", "__Secure-authjs.session-token"];

  for (const baseName of baseNames) {
    let raw = req.cookies.get(baseName)?.value;

    // Try chunked cookies (.0, .1, .2, …)
    if (!raw) {
      const chunks: string[] = [];
      for (let i = 0; ; i++) {
        const chunk = req.cookies.get(`${baseName}.${i}`)?.value;
        if (!chunk) break;
        chunks.push(chunk);
      }
      if (chunks.length > 0) raw = chunks.join("");
    }

    if (!raw) continue;

    try {
      // IMPORTANT: salt must match cookie name used by Auth.js
      const decoded = await decode({ token: raw, secret, salt: baseName });
      if (decoded) return decoded as Record<string, unknown>;
    } catch (e) {
      dlog("JWT decode failed for", baseName, e);
    }
  }

  return null;
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

function buildUpstreamHeaders(req: NextRequest, accessToken: string): Headers {
  const headers = new Headers(req.headers);

  // Never forward browser cookies to the API
  headers.delete("cookie");

  // Force our Authorization
  headers.delete("authorization");
  headers.set("authorization", `Bearer ${accessToken}`);

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

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path = [] } = await ctx.params;

  // auth() triggers the full JWT callback chain — including silent token refresh
  const session = await auth();

  dlog("session:", {
    hasSession: !!session,
    userId: session?.user?.id,
    error: session?.error,
  });

  // Read accessToken directly from JWT cookie (bypasses session callback).
  // This prevents XSS — client never sees accessToken via /api/auth/session.
  const authSecret = envServer.AUTH_SECRET;

  const publicOrigin = getPublicOrigin(req);
  const isSecure =
    publicOrigin.startsWith("https://") ||
    new URL(envServer.HSS_WEB_ORIGIN).protocol === "https:";

  const jwt = await readSessionJwt(req, authSecret, isSecure);
  const accessToken = jwt?.accessToken as string | undefined;

  dlog("jwt decoded:", {
    hasJwt: !!jwt,
    hasAccessToken: !!accessToken,
  });

  if (!accessToken) {
    return jsonNoStore(
      {
        error:
          session?.error === "RefreshTokenExpired"
            ? "Session expired (refresh token invalid). Please log in again."
            : "Unauthorized (no session or accessToken missing)",
      },
      401,
    );
  }

  const claims = decodeJwtClaims(accessToken);
  dlog("access token claims:", {
    iss: claims?.iss,
    aud: claims?.aud,
    azp: claims?.azp,
    exp: claims?.exp,
    realmRoles: claims?.realm_access?.roles,
  });

  let upstreamUrl: URL;
  try {
    upstreamUrl = buildUpstreamUrl(req, path);
  } catch (e) {
    dlog("upstream url build error:", String(e));
    return jsonNoStore({ error: "Server misconfigured (HSS_API_BASE_URL)" }, 500);
  }

  const upstreamHeaders = buildUpstreamHeaders(req, accessToken);
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

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: downstreamHeaders,
    });
  } catch (e) {
    dlog("fetch upstream failed:", String(e));
    return jsonNoStore({ error: "Bad gateway" }, 502);
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