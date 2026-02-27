// @file: apps/web/src/lib/api-server.ts
import "server-only";
import { auth } from "@/auth";
import { envServer } from "@/config/env.server";

export class ApiServerError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiServerError";
  }
}

/** Serwerowy odpowiednik apiFetch — pobiera accessToken przez auth() i woła NestJS API bezpośrednio. */
export async function apiServerFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const session = await auth();
  const accessToken = session?.accessToken;

  if (!accessToken) {
    throw new ApiServerError(401, "Authentication required", "AUTHENTICATION_REQUIRED");
  }

  const base = envServer.HSS_API_BASE_URL.replace(/\/$/, "");
  const requestInit: RequestInit = {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  };

  const res = await fetch(`${base}/${path}`, requestInit);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.message ?? body?.error ?? "Request failed";
    throw new ApiServerError(res.status, message, body?.code);
  }

  return res.json() as Promise<T>;
}
