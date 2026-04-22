// @file: apps/web/src/components/home/HomePageClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GetBackendHealthResponseSchema,
  type GetBackendHealthResponse,
} from "@hss/schemas";
import type { HomePageClientProps } from "@/components/props/pages";
import { Button } from "@/components/ui/Button";

type BackendState = {
  loading: boolean;
  status: number | null;
  ok: boolean | null;
  data: GetBackendHealthResponse | null;
  error?: string;
};

function formatText(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function HomePageClient({ messages }: HomePageClientProps) {
  const [backend, setBackend] = useState<BackendState>({
    loading: true,
    status: null,
    ok: null,
    data: null,
  });

  const load = useCallback(async () => {
    setBackend((s) => ({ ...s, loading: true, error: undefined }));

    try {
      const res = await fetch("/api/backend/health", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: { accept: "application/json" },
      });

      if (!res.ok) {
        const authRequired = res.status === 401 || res.status === 403;
        setBackend({
          loading: false,
          status: res.status,
          ok: false,
          data: null,
          error: authRequired
            ? messages.status.authRequired
            : formatText(messages.status.requestFailed, { status: res.status }),
        });
        return;
      }

      const json = await res.json().catch(() => null);
      const parsed = GetBackendHealthResponseSchema.safeParse(json);
      const data = parsed.success ? parsed.data : null;

      setBackend({
        loading: false,
        status: res.status,
        ok: res.ok,
        data,
        error: parsed.success ? undefined : messages.status.invalidSchema,
      });
    } catch (e) {
      setBackend({
        loading: false,
        status: null,
        ok: false,
        data: null,
        error: e instanceof Error ? e.message : messages.status.unknownError,
      });
    }
  }, [messages.status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  // Prefer payload message if available; otherwise fall back to HTTP ok.
  const isHealthy = useMemo(() => {
    if (backend.data && "message" in backend.data) {
      return backend.data.message === "healthy";
    }
    return backend.ok === true;
  }, [backend.data, backend.ok]);

  const isAuthRequired = backend.status === 401 || backend.status === 403;
  const healthLabel = backend.loading
    ? messages.status.checking
    : isAuthRequired
      ? messages.status.authRequiredShort
      : isHealthy
        ? messages.status.healthy
        : messages.status.unhealthy;

  const statusText = formatText(messages.status.backendHealthStatus, {
    status: backend.status ?? "—",
  });

  return (
    <div className="flex flex-wrap gap-3 bg-background p-6 text-foreground">
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button>{messages.buttons.clickMe}</Button>

          <Button colorClass="bg-green-700 text-white border-green-800">
            {messages.buttons.deploy}
          </Button>

          <Button
            type="button"
            onClick={load}
            disabled={backend.loading}
            colorClass="bg-blue-600 text-white border-blue-700"
          >
            {backend.loading ? messages.buttons.refreshing : messages.buttons.refresh}
          </Button>
        </div>

        <div className="mt-6">
          <div className="text-sm opacity-70">
            {statusText}{" "}
            {backend.ok === null ? "" : backend.ok ? messages.status.ok : messages.status.error}
            {backend.error ? ` • ${backend.error}` : ""}
          </div>

          <div className="mt-2 rounded-md border border-border bg-muted p-4 text-sm">
            {messages.status.backendHealth}{" "}
            <span className="font-medium">{healthLabel}</span>
            {backend.data &&
            "message" in backend.data &&
            typeof backend.data.message === "string" ? (
              <>
                <span className="opacity-70"> • </span>
                <span className="opacity-70">
                  {formatText(messages.status.message, {
                    message: backend.data.message,
                  })}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
