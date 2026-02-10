// @file: apps/web/src/app/[locale]/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type BackendState = {
  loading: boolean;
  status: number | null;
  ok: boolean | null;
  data: unknown;
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
      const res = await fetch("/api/backend/user", {
        method: "GET",
        cache: "no-store",
        credentials: "include", // send cookies to same-origin (HttpOnly stays hidden from JS)
        headers: { accept: "application/json" },
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }

      setBackend({
        loading: false,
        status: res.status,
        ok: res.ok,
        data,
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
    void load();
  }, [load]);

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
            Backend /user status:{" "}
            {backend.status ?? "—"}{" "}
            {backend.ok === null ? "" : backend.ok ? "(ok)" : "(error)"}
            {backend.error ? ` • ${backend.error}` : ""}
          </div>

          <pre className="mt-2 max-w-225 overflow-auto rounded-md border border-border bg-muted p-4 text-xs leading-relaxed">
            {JSON.stringify(backend.data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
