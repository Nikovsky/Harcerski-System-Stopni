// @file: apps/web/src/server/auth-api.client.ts
import "server-only";

import { envServer } from "@/config/env.server";

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

function apiBaseUrl(): string {
  return envServer.HSS_API_BASE_URL.replace(/\/$/, "");
}

export function buildAuthApiHeaders(
  source: Headers,
  requestId?: string,
): Headers {
  const headers = new Headers(source);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("authorization");
  for (const name of HOP_BY_HOP) headers.delete(name);

  headers.set("x-hss-bff-secret", envServer.HSS_BFF_INTERNAL_SECRET);
  headers.set("origin", envServer.HSS_WEB_ORIGIN);
  headers.delete("referer");
  headers.set("x-forwarded-host", new URL(envServer.HSS_WEB_ORIGIN).host);
  headers.set(
    "x-forwarded-proto",
    new URL(envServer.HSS_WEB_ORIGIN).protocol.slice(0, -1),
  );
  if (requestId) headers.set("x-request-id", requestId);
  return headers;
}

export async function fetchAuthApi(
  path: string,
  sourceHeaders: Headers,
  init: Omit<RequestInit, "signal"> = {},
  requestId?: string,
): Promise<Response> {
  if (!path.startsWith("/")) {
    throw new Error("Auth API path must be absolute.");
  }

  const headers = buildAuthApiHeaders(sourceHeaders, requestId);
  if (init.headers) {
    new Headers(init.headers).forEach((value, name) =>
      headers.set(name, value),
    );
  }

  return fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}

export function copySetCookies(source: Headers, target: Headers): void {
  const headers = source as Headers & { getSetCookie?: () => string[] };
  const values = headers.getSetCookie?.() ?? [];
  if (values.length > 0) {
    for (const value of values) target.append("set-cookie", value);
    return;
  }

  const value = source.get("set-cookie");
  if (value) target.append("set-cookie", value);
}
