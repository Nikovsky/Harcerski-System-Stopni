// @file: apps/web/src/lib/api.ts
import type { ZodType } from "zod";

type ApiErrorPayload = {
  code?: string;
  message?: string;
  error?: string;
  missingFields?: string[];
  existingUuid?: string;
  requestId?: string;
};

function toApiErrorPayload(value: unknown): ApiErrorPayload {
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
    missingFields: Array.isArray(payload.missingFields)
      ? payload.missingFields.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    existingUuid: typeof payload.existingUuid === "string" ? payload.existingUuid : undefined,
    requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
  };
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }
  return headers;
}

/** Thin wrapper around fetch for BFF proxy calls. */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, {
    ...init,
    headers: buildHeaders(init),
  });

  const body = (await res.json().catch(() => null)) as unknown;
  const payload = toApiErrorPayload(body);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload.message ?? `Request failed (${res.status})`,
      payload.code,
      payload.missingFields,
      payload.existingUuid,
      payload.requestId,
    );
  }

  return body as T;
}

export async function apiFetchValidated<T>(
  schema: ZodType<T>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const body = await apiFetch<unknown>(path, init);
  return schema.parse(body);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly missingFields?: string[],
    public readonly existingUuid?: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
