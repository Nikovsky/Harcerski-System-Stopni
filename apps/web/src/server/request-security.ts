// @file: apps/web/src/server/request-security.ts
import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { envServer } from "@/config/env.server";

export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

const TRUSTED_WEB_HOST = new URL(envServer.HSS_WEB_ORIGIN).host.toLowerCase();

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;

  const first = value.split(",")[0]?.trim();
  if (!first) return null;

  return first;
}

function normalizeIpCandidate(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.toLowerCase() === "unknown") return null;
  if (normalized.length > 128) return null;
  if (!/^[A-Za-z0-9:.%-]+$/.test(normalized)) return null;

  return normalized;
}

function lastForwardedForValue(value: string | null): string | null {
  if (!value) return null;

  const parts = value
    .split(",")
    .map((part) => normalizeIpCandidate(part))
    .filter((part): part is string => Boolean(part));

  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}

function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  return normalized;
}

export function normalizeRequestId(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized || !REQUEST_ID_PATTERN.test(normalized)) return null;

  return normalized;
}

export function getOrCreateRequestId(req: Pick<NextRequest, "headers">): string {
  return normalizeRequestId(req.headers.get("x-request-id")) ?? randomUUID();
}

export function getRequestHost(
  req: Pick<NextRequest, "headers" | "nextUrl">,
): string | null {
  const forwardedHost = normalizeHost(
    firstHeaderValue(req.headers.get("x-forwarded-host")),
  );
  if (forwardedHost) return forwardedHost;

  const host = normalizeHost(firstHeaderValue(req.headers.get("host")));
  if (host) return host;

  return normalizeHost(req.nextUrl.host);
}

export function isTrustedRequestHost(
  req: Pick<NextRequest, "headers" | "nextUrl">,
): boolean {
  const requestHost = getRequestHost(req);
  if (!requestHost) return false;

  return requestHost === TRUSTED_WEB_HOST;
}

export function getClientIp(req: Pick<NextRequest, "headers">): string {
  // Prefer proxy-controlled header to avoid trusting user-supplied X-Forwarded-For.
  const realIp = normalizeIpCandidate(firstHeaderValue(req.headers.get("x-real-ip")));
  if (realIp) return realIp;

  // Fallback to the right-most forwarded hop when X-Real-IP is unavailable.
  const forwardedFor = lastForwardedForValue(req.headers.get("x-forwarded-for"));
  if (forwardedFor) return forwardedFor;

  return "unknown";
}

export function forbiddenResponse(
  requestId: string,
  message = "Forbidden.",
): NextResponse {
  const res = NextResponse.json(
    { code: "FORBIDDEN", message, requestId },
    { status: 403 },
  );
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

export function rateLimitExceededResponse(requestId: string): NextResponse {
  const res = NextResponse.json(
    {
      code: "FORBIDDEN",
      message: "Too many requests.",
      requestId,
    },
    { status: 429 },
  );
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("x-request-id", requestId);
  return res;
}

export function requireTrustedHost(
  req: Pick<NextRequest, "headers" | "nextUrl">,
  requestId: string,
): NextResponse | null {
  if (isTrustedRequestHost(req)) return null;
  return forbiddenResponse(requestId);
}
