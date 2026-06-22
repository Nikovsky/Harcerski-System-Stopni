// @file: apps/web/src/components/auth/IdleTimeoutGuard.tsx
"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  bffSessionStatusResponseSchema,
  bffSessionTouchResponseSchema,
} from "@hss/schemas";

import { envPublic } from "@/config/env.client";
import { Button } from "@/components/ui/Button";
import { Popup } from "@/components/ui/Popup";
import { Throbber } from "@/components/ui/Throbber";

const CHANNEL_NAME = "hss-idle-timeout";
const SESSION_EXPIRES_AT_STORAGE_KEY = "hss.session.expiresAtMs";

type ChannelMessage =
  | { type: "sync"; expiresAtMs: number }
  | { type: "logout" };

type SessionStatus = {
  authenticated: boolean;
  idleExpiresAtMs: number | null;
  absoluteExpiresAtMs: number | null;
};

type IdleTimeoutGuardProps = {
  locale: string;
};

function parseExtendOptions(csv: string): number[] {
  const values = csv
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  const uniqueSorted = Array.from(new Set(values)).sort((a, b) => a - b);
  return uniqueSorted.length > 0 ? uniqueSorted : [10, 20, 30];
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function parseIsoToMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readStoredExpiresAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_EXPIRES_AT_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function writeStoredExpiresAt(expiresAtMs: number): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_EXPIRES_AT_STORAGE_KEY, String(expiresAtMs));
}

function clearStoredExpiresAt(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_EXPIRES_AT_STORAGE_KEY);
}

async function fetchSessionStatus(): Promise<SessionStatus | null> {
  try {
    const res = await fetch("/api/session/status", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => null)) as unknown;
    const parsed = bffSessionStatusResponseSchema.safeParse(payload);
    if (!parsed.success) return null;

    return {
      authenticated: parsed.data.authenticated,
      idleExpiresAtMs: parseIsoToMs(parsed.data.idleExpiresAt),
      absoluteExpiresAtMs: parseIsoToMs(parsed.data.absoluteExpiresAt),
    };
  } catch {
    return null;
  }
}

async function touchSession(extendSeconds?: number): Promise<SessionStatus | null> {
  try {
    const body = extendSeconds
      ? JSON.stringify({ extendSeconds })
      : undefined;

    const res = await fetch("/api/session/touch", {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
      cache: "no-store",
    });

    if (res.status === 401) {
      return { authenticated: false, idleExpiresAtMs: null, absoluteExpiresAtMs: null };
    }

    const payload = (await res.json().catch(() => null)) as unknown;
    const parsed = bffSessionTouchResponseSchema.safeParse(payload);
    if (!parsed.success) return null;

    return {
      authenticated: true,
      idleExpiresAtMs: parseIsoToMs(parsed.data.idleExpiresAt),
      absoluteExpiresAtMs: parseIsoToMs(parsed.data.absoluteExpiresAt),
    };
  } catch {
    return null;
  }
}

export function IdleTimeoutGuard({ locale }: IdleTimeoutGuardProps) {
  const t = useTranslations("common.idleTimeout");
  const pathname = usePathname();
  const localeRoot = locale === "en" ? "/en" : "/pl";

  const sessionTimeoutSec = envPublic.NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS;
  const promptBeforeExpirySec = envPublic.NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS;
  const authCheckIntervalSec = envPublic.NEXT_PUBLIC_SESSION_AUTH_CHECK_INTERVAL_SECONDS;
  const extendOptionsMinutes = useMemo(
    () => parseExtendOptions(envPublic.NEXT_PUBLIC_SESSION_EXTEND_OPTIONS_MINUTES),
    [],
  );
  const defaultExtendMinutes = extendOptionsMinutes[0] ?? 10;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [remainingSec, setRemainingSec] = useState(sessionTimeoutSec);
  const [selectedExtendMinutes, setSelectedExtendMinutes] = useState(defaultExtendMinutes);

  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<number>(0);
  const logoutStartedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const previousPathnameRef = useRef<string | null>(null);

  const clearSessionTimers = useCallback(() => {
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const syncRemaining = useCallback(() => {
    const next = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1_000));
    setRemainingSec(next);
    return next;
  }, []);

  const startCountdownTicker = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      syncRemaining();
    }, 1_000);
    syncRemaining();
  }, [syncRemaining]);

  const broadcast = useCallback((msg: ChannelMessage) => {
    channelRef.current?.postMessage(msg);
  }, []);

  const applyExpiry = useCallback(
    (expiresAtMs: number, shouldBroadcast = true) => {
      if (logoutStartedRef.current) return;
      clearSessionTimers();
      expiresAtRef.current = Math.max(expiresAtMs, Date.now());
      writeStoredExpiresAt(expiresAtRef.current);
      setIsDialogOpen(false);
      setIsLoggingOut(false);
      startCountdownTicker();

      const delayMs = Math.max(0, expiresAtRef.current - Date.now() - promptBeforeExpirySec * 1_000);
      promptTimerRef.current = setTimeout(() => {
        setIsDialogOpen(true);
        syncRemaining();
      }, delayMs);

      if (shouldBroadcast) {
        broadcast({ type: "sync", expiresAtMs: expiresAtRef.current });
      }
    },
    [broadcast, clearSessionTimers, promptBeforeExpirySec, startCountdownTicker, syncRemaining],
  );

  const applyDuration = useCallback(
    (durationSec: number, shouldBroadcast = true) => {
      applyExpiry(Date.now() + Math.max(1, durationSec) * 1_000, shouldBroadcast);
    },
    [applyExpiry],
  );

  const doLogout = useCallback(async (reason: "timeout" | "manual" = "timeout") => {
    if (logoutStartedRef.current) return;
    logoutStartedRef.current = true;
    setIsLoggingOut(true);
    if (reason !== "manual") {
      setIsDialogOpen(false);
    }

    try {
      broadcast({ type: "logout" });
      clearStoredExpiresAt();
      const logoutParams = new URLSearchParams({
        returnTo: localeRoot,
      });
      if (reason === "timeout") {
        logoutParams.set("reason", "timeout");
      }
      const logoutUrl = `/api/auth/logout?${logoutParams.toString()}`;
      await fetch(logoutUrl, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      // Ignore network errors and proceed with redirect.
    }

    window.location.href = localeRoot;
  }, [broadcast, localeRoot]);

  const touchServerSession = useCallback(
    async (extendSeconds?: number) => {
      if (logoutStartedRef.current) return;
      const touched = await touchSession(extendSeconds);
      if (!touched) return;

      if (!touched.authenticated || !touched.idleExpiresAtMs) {
        await doLogout();
        return;
      }

      applyExpiry(touched.idleExpiresAtMs);
    },
    [applyExpiry, doLogout],
  );

  const extendSession = useCallback(() => {
    void touchServerSession(selectedExtendMinutes * 60);
  }, [selectedExtendMinutes, touchServerSession]);

  const closeDialog = useCallback(() => {
    if (isLoggingOut) return;
    setIsDialogOpen(false);
  }, [isLoggingOut]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
      const message = event.data;
      if (message.type === "sync") {
        applyExpiry(message.expiresAtMs, false);
        return;
      }

      if (message.type === "logout" && !logoutStartedRef.current) {
        void doLogout();
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [applyExpiry, doLogout]);

  useEffect(() => {
    let disposed = false;

    const bootstrap = async () => {
      const storedExpiresAt = readStoredExpiresAt();
      const now = Date.now();

      if (storedExpiresAt && storedExpiresAt > now) {
        applyExpiry(storedExpiresAt, false);
      } else {
        applyDuration(sessionTimeoutSec, false);
      }

      setSelectedExtendMinutes(defaultExtendMinutes);

      const status = await fetchSessionStatus();
      if (disposed || logoutStartedRef.current) return;
      if (!status) return;

      if (!status.authenticated || !status.idleExpiresAtMs) {
        await doLogout();
        return;
      }

      applyExpiry(status.idleExpiresAtMs, false);
    };

    void bootstrap();

    return () => {
      disposed = true;
      clearSessionTimers();
    };
  }, [
    applyDuration,
    applyExpiry,
    clearSessionTimers,
    defaultExtendMinutes,
    doLogout,
    sessionTimeoutSec,
  ]);

  useEffect(() => {
    if (logoutStartedRef.current) return;
    if (previousPathnameRef.current === null) {
      previousPathnameRef.current = pathname;
      return;
    }

    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      const timer = window.setTimeout(() => {
        void touchServerSession();
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [pathname, touchServerSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (logoutStartedRef.current) return;

      void (async () => {
        const status = await fetchSessionStatus();
        if (!status) return;

        if (!status.authenticated || !status.idleExpiresAtMs) {
          await doLogout();
          return;
        }

        if (Math.abs(status.idleExpiresAtMs - expiresAtRef.current) > 1_500) {
          applyExpiry(status.idleExpiresAtMs, false);
        }
      })();
    }, Math.max(10, authCheckIntervalSec) * 1_000);

    return () => {
      clearInterval(interval);
    };
  }, [applyExpiry, authCheckIntervalSec, doLogout]);

  useEffect(() => {
    if (remainingSec <= 0 && !logoutStartedRef.current) {
      const timer = window.setTimeout(() => {
        void doLogout();
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [doLogout, remainingSec]);

  const isUrgent = remainingSec <= promptBeforeExpirySec;
  const timerText = formatClock(remainingSec);
  const showSessionButton = remainingSec <= promptBeforeExpirySec || isDialogOpen || isLoggingOut;

  return (
    <>
      {showSessionButton && (
        <div className="pointer-events-none fixed inset-0 z-9900">
          <Button
            type="button"
            tone="main"
            onClick={() => setIsDialogOpen(true)}
            className={[
              "pointer-events-auto fixed right-0 top-[100px] z-50 h-8 min-h-8 w-fit max-w-max rounded-l-2xl rounded-r-none border-r-0 px-5 py-2",
              "flex items-center justify-center overflow-visible",
              "backdrop-blur",
              "transition-colors",
              isUrgent ? "ring-2 ring-red-500/50" : "",
            ].join(" ")}
          >
            <span className="pt-1 text-sm font-semibold">{t("sessionButton")}</span>
            <span
              className={[
                "pointer-events-none absolute left-0 top-0 inline-flex min-w-14 -translate-x-1/2 -translate-y-1/2 justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                isUrgent
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 text-white",
              ].join(" ")}
            >
              {timerText}
            </span>
          </Button>
        </div>
      )}

      {(isDialogOpen || isLoggingOut) && (
        <Popup
          onClose={closeDialog}
          ariaLabel={t("ariaLabel")}
          closeButtonAriaLabel={t("closeButtonAria")}
          title={t("title")}
          disableClose={isLoggingOut}
          showCloseButton={!isLoggingOut}
          content={
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                {t("willExpireIn")}{" "}
                <span className="font-semibold tabular-nums">{timerText}</span>.
              </p>
              {isLoggingOut ? (
                <p className="text-muted-foreground">{t("loggingOut")}</p>
              ) : (
                <p className="text-muted-foreground">
                  {t("helpText")}
                </p>
              )}
            </div>
          }
          actions={
            isLoggingOut ? undefined : (
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    htmlFor="session-extend-select"
                  >
                    {t("extendLabel")}
                  </label>
                  <select
                    id="session-extend-select"
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedExtendMinutes}
                    onChange={(e) => setSelectedExtendMinutes(Number.parseInt(e.target.value, 10))}
                    disabled={isLoggingOut}
                  >
                    {extendOptionsMinutes.map((min) => (
                      <option key={min} value={min}>
                        {t("minutesOption", { minutes: min })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    colorClass="bg-red-600 text-white border-red-700"
                    onClick={() => void doLogout("manual")}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <Throbber
                        inline={true}
                        factor={1}
                        className="h-4 w-4"
                        ariaLabel={t("loggingOut")}
                      />
                    ) : (
                      t("logoutNow")
                    )}
                  </Button>

                  <Button
                    type="button"
                    colorClass="bg-blue-600 text-white border-blue-700"
                    onClick={extendSession}
                    disabled={isLoggingOut}
                  >
                    {t("extendSession")}
                  </Button>
                </div>
              </div>
            )
          }
        />
      )}
    </>
  );
}
