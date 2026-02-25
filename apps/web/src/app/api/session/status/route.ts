// @file: apps/web/src/app/api/session/status/route.ts
import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { BffSessionStatusResponse } from "@hss/schemas";

import { envServer } from "@/config/env.server";
import { normalizeSessionSidFromCookie, readSessionBySid } from "@/lib/server/bff-session.store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequestId(req: NextRequest): string {
  const raw = req.headers.get("x-request-id")?.trim();
  if (raw && /^[A-Za-z0-9._:-]{8,128}$/.test(raw)) return raw;
  return randomUUID();
}

function jsonNoStore(body: unknown, requestId: string, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(req);
  const sidCookie = req.cookies.get(envServer.HSS_SESSION_COOKIE_NAME)?.value;
  const sid = normalizeSessionSidFromCookie(sidCookie);

  if (!sid) {
    const payload: BffSessionStatusResponse = {
      authenticated: false,
      idleExpiresAt: null,
      absoluteExpiresAt: null,
      requestId,
    };
    return jsonNoStore(payload, requestId);
  }

  const session = await readSessionBySid(sid);
  if (!session) {
    const payload: BffSessionStatusResponse = {
      authenticated: false,
      idleExpiresAt: null,
      absoluteExpiresAt: null,
      requestId,
    };
    return jsonNoStore(payload, requestId);
  }

  const payload: BffSessionStatusResponse = {
    authenticated: true,
    idleExpiresAt: session.idleExpiresAt.toISOString(),
    absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
    requestId,
  };

  return jsonNoStore(payload, requestId);
}
