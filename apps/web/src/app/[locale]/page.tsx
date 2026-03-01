// @file: apps/web/src/app/[locale]/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GetBackendHealthResponseSchema,
  type GetBackendHealthResponse,
} from "@hss/schemas";
import { Button } from "@/components/ui/Button";

type BackendState = {
  loading: boolean;
  status: number | null;
  ok: boolean | null;
  data: GetBackendHealthResponse | null;
  error?: string;
};

export default function Page() {
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
            ? "Authentication required for /api/backend/health."
            : `Request failed (${res.status})`,
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
        error: parsed.success ? undefined : "Invalid health response schema",
      });
    } catch (e) {
      setBackend({
        loading: false,
        status: null,
        ok: false,
        data: null,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
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
    ? "checking…"
    : isAuthRequired
      ? "auth required"
      : isHealthy
        ? "healthy"
        : "unhealthy";

  return (
    <div className="flex flex-wrap gap-3 p-6 bg-background text-foreground">
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Click me</Button>

          <Button colorClass="bg-green-600 text-white border-green-700">
            Deploy
          </Button>

          <Button
            type="button"
            onClick={load}
            disabled={backend.loading}
            colorClass="bg-blue-600 text-white border-blue-700"
          >
            {backend.loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <div className="mt-6">
          <div className="text-sm opacity-70">
            Backend /health status: {backend.status ?? "—"}{" "}
            {backend.ok === null ? "" : backend.ok ? "(ok)" : "(error)"}
            {backend.error ? ` • ${backend.error}` : ""}
          </div>

          <div className="mt-2 rounded-md border border-border bg-muted p-4 text-sm">
            Backend health: <span className="font-medium">{healthLabel}</span>
            {backend.data && "message" in backend.data && typeof backend.data.message === "string" ? (
              <>
                <span className="opacity-70"> • </span>
                <span className="opacity-70">message: {backend.data.message}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
