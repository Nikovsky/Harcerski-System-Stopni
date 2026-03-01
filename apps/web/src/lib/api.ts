// @file: apps/web/src/lib/api.ts

/** Thin wrapper around fetch for BFF proxy calls. */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/backend/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.message ?? body?.error ?? "Request failed";
    throw new ApiError(res.status, message, body?.code, body?.missingFields, body?.existingUuid);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly missingFields?: string[],
    public readonly existingUuid?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
