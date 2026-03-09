// @file: apps/web/src/server/bff-fetch.ts
import "server-only";

import { headers } from "next/headers";
import type { ZodType } from "zod";
import { auth } from "@/auth";
import { envServer } from "@/config/env.server";
import { normalizeRequestId } from "@/server/request-security";

type BffErrorPayload = {
  code?: string;
  message?: string;
  error?: string;
  requestId?: string;
};

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "");
}

function getSessionAccessToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function buildApiUrl(path: string): string {
  const baseUrl = envServer.HSS_API_BASE_URL.replace(/\/$/, "");
  return `${baseUrl}/${normalizePath(path)}`;
}

function buildUpstreamHeaders(
  initHeaders: HeadersInit | undefined,
  requestId: string | null,
  accessToken?: string,
): Headers {
  const upstreamHeaders = new Headers(initHeaders);

  upstreamHeaders.delete("authorization");
  upstreamHeaders.delete("content-length");
  upstreamHeaders.delete("cookie");
  upstreamHeaders.delete("host");

  if (accessToken) {
    upstreamHeaders.set("authorization", `Bearer ${accessToken}`);
  }

  if (requestId && !upstreamHeaders.has("x-request-id")) {
    upstreamHeaders.set("x-request-id", requestId);
  }

  if (!upstreamHeaders.has("accept")) {
    upstreamHeaders.set("accept", "application/json");
  }

  return upstreamHeaders;
}

function toBffErrorPayload(value: unknown): BffErrorPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const payload = value as Record<string, unknown>;
  return {
    code: typeof payload.code === "string" ? payload.code : undefined,
    message:
      typeof payload.message === "string"
        ? payload.message
        : typeof payload.error === "string"
          ? payload.error
          : undefined,
    error: typeof payload.error === "string" ? payload.error : undefined,
    requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
  };
}

export class BffServerFetchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "BffServerFetchError";
  }
}

export async function bffServerFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const incomingHeaders = await headers();
  const requestId = normalizeRequestId(incomingHeaders.get("x-request-id"));
  const session = await auth();
  const accessToken = getSessionAccessToken(session?.accessToken);
  const upstreamHeaders = buildUpstreamHeaders(
    init?.headers,
    requestId,
    accessToken,
  );
  const targetUrl = buildApiUrl(path);

  const res = await fetch(targetUrl, {
    ...init,
    headers: upstreamHeaders,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(30_000),
  });

  const body = (await res.json().catch(() => null)) as unknown;
  const payload = toBffErrorPayload(body);

  if (!res.ok) {
    throw new BffServerFetchError(
      res.status,
      payload.message ?? `Request failed (${res.status})`,
      payload.code,
      payload.requestId,
    );
  }

  return body as T;
}

export async function bffServerFetchValidated<T>(
  schema: ZodType<T>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const body = await bffServerFetch<unknown>(path, init);
  return schema.parse(body);
}
