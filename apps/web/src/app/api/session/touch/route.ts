// @file: apps/web/src/app/api/session/touch/route.ts
import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  bffSessionTouchRequestSchema,
  type BffErrorCode,
  type BffErrorResponse,
  type BffSessionTouchRequest,
  type BffSessionTouchResponse,
} from "@hss/schemas";

import { envServer } from "@/config/env.server";
import { normalizeSessionSidFromCookie, touchSessionBySid } from "@/lib/server/bff-session.store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequestId(req: NextRequest): string {
  const raw = req.headers.get("x-request-id")?.trim();
  if (raw && /^[A-Za-z0-9._:-]{8,128}$/.test(raw)) return raw;
  return randomUUID();
}

function jsonNoStore(body: unknown, status: number, requestId: string): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

function errorNoStore(status: number, code: BffErrorCode, message: string, requestId: string): NextResponse {
  const payload: BffErrorResponse = { code, message, requestId };
  return jsonNoStore(payload, status, requestId);
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
  const origin = req.headers.get("origin");
  if (origin) return origin;
  return parseOriginFromReferer(req.headers.get("referer"));
}

function enforceSameOriginCsrf(req: NextRequest, requestId: string): NextResponse | null {
  const allowedOrigin = new URL(envServer.HSS_WEB_ORIGIN).origin;
  const requestOrigin = getRequestOrigin(req);

  if (!requestOrigin || requestOrigin !== allowedOrigin) {
    return errorNoStore(403, "FORBIDDEN", "Forbidden.", requestId);
  }

  return null;
}

async function readTouchBody(req: NextRequest): Promise<BffSessionTouchRequest | null> {
  const length = req.headers.get("content-length");
  if (!length || length === "0") {
    return {};
  }

  try {
    const parsed = (await req.json()) as unknown;
    const validated = bffSessionTouchRequestSchema.safeParse(parsed);
    if (!validated.success) return null;
    return validated.data;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(req);
  const csrfFailure = enforceSameOriginCsrf(req, requestId);
  if (csrfFailure) return csrfFailure;

  const body = await readTouchBody(req);
  if (!body) {
    return errorNoStore(400, "INVALID_REQUEST", "Invalid request payload.", requestId);
  }

  const sidCookie = req.cookies.get(envServer.HSS_SESSION_COOKIE_NAME)?.value;
  const sid = normalizeSessionSidFromCookie(sidCookie);
  if (!sid) {
    return errorNoStore(401, "AUTHENTICATION_REQUIRED", "Authentication required.", requestId);
  }

  const touched = await touchSessionBySid(sid, body.extendSeconds);
  if (!touched.token) {
    return errorNoStore(401, "SESSION_EXPIRED", "Session expired. Please log in again.", requestId);
  }

  const payload: BffSessionTouchResponse = {
    touched: touched.touched,
    idleExpiresAt: touched.idleExpiresAt?.toISOString() ?? null,
    absoluteExpiresAt: touched.absoluteExpiresAt?.toISOString() ?? null,
    requestId,
  };

  return jsonNoStore(payload, 200, requestId);
}
