// @file: apps/web/src/app/[locale]/applications/_server/bff-fetch.ts
import "server-only";

import { headers } from "next/headers";
import { envServer } from "@/config/env.server";

type BffErrorPayload = {
  code?: string;
  message?: string;
  error?: string;
  requestId?: string;
};

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "");
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
  const upstreamHeaders = new Headers(init?.headers);

  const cookie = incomingHeaders.get("cookie");
  if (cookie) {
    upstreamHeaders.set("cookie", cookie);
  }

  if (!upstreamHeaders.has("accept")) {
    upstreamHeaders.set("accept", "application/json");
  }

  const baseUrl = envServer.HSS_WEB_ORIGIN.replace(/\/$/, "");
  const targetUrl = `${baseUrl}/api/backend/${normalizePath(path)}`;

  const res = await fetch(targetUrl, {
    ...init,
    headers: upstreamHeaders,
    cache: "no-store",
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
