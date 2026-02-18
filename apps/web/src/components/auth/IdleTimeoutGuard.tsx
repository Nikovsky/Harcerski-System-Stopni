// @file: apps/web/src/components/auth/IdleTimeoutGuard.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { envPublic } from "@/config/env.client";

type Phase = "idle" | "warning" | "logging-out";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart", "scroll", "click"] as const;
const THROTTLE_MS = 1_000;
const CHANNEL_NAME = "hss-idle-timeout";

const EXTEND_OPTIONS_MINUTES = [15, 30, 60] as const;

type ChannelMessage =
  | { type: "activity" }
  | { type: "reset"; delaySec: number };

export function IdleTimeoutGuard() {
  const t = useTranslations("common.sessionTimeout");

  const hardWarnSec = envPublic.NEXT_PUBLIC_SESSION_HARD_WARN_SECONDS;
  const totalSec = envPublic.NEXT_PUBLIC_SESSION_WARN_SECONDS;
  const countdownTotal = totalSec - hardWarnSec;

  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(countdownTotal);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const channelRef = useRef<BroadcastChannel | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const doLogout = useCallback(async () => {
    setPhase("logging-out");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/";
  }, []);

  const startCountdown = useCallback(() => {
    setPhase("warning");
    setSecondsLeft(countdownTotal);

    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          doLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }, [countdownTotal, doLogout]);

  const scheduleWarning = useCallback(
    (delaySec: number, broadcast = true) => {
      clearTimers();
      setPhase("idle");
      lastActivityRef.current = Date.now();

      idleTimerRef.current = setTimeout(() => {
        startCountdown();
      }, delaySec * 1_000);

      if (broadcast) {
        channelRef.current?.postMessage({ type: "reset", delaySec } satisfies ChannelMessage);
      }
    },
    [clearTimers, startCountdown],
  );

  const resetIdleTimer = useCallback(
    (broadcast = true) => {
      scheduleWarning(hardWarnSec, broadcast);
    },
    [hardWarnSec, scheduleWarning],
  );

  const handleExtend = (minutes: number) => {
    scheduleWarning(minutes * 60);
  };

  // BroadcastChannel — sync between tabs
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (e: MessageEvent<ChannelMessage>) => {
      const msg = e.data;
      if (msg.type === "activity") {
        // Other tab had activity — reset timer if we're idle (not in warning)
        setPhase((current) => {
          if (current === "idle") {
            lastActivityRef.current = Date.now();
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
              startCountdown();
            }, hardWarnSec * 1_000);
          }
          return current;
        });
      } else if (msg.type === "reset") {
        // Other tab clicked "stay logged in" or extend — reset locally without re-broadcasting
        scheduleWarning(msg.delaySec, false);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [hardWarnSec, startCountdown, scheduleWarning]);

  // Activity listener
  useEffect(() => {
    let throttled = false;

    const onActivity = () => {
      if (throttled) return;
      throttled = true;
      setTimeout(() => {
        throttled = false;
      }, THROTTLE_MS);

      if (Date.now() - lastActivityRef.current > THROTTLE_MS) {
        lastActivityRef.current = Date.now();

        // Broadcast activity to other tabs
        channelRef.current?.postMessage({ type: "activity" } satisfies ChannelMessage);

        // Don't reset during warning — user must click button
        setPhase((current) => {
          if (current === "idle") {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
              startCountdown();
            }, hardWarnSec * 1_000);
          }
          return current;
        });
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    resetIdleTimer(false);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      clearTimers();
    };
  }, [hardWarnSec, startCountdown, resetIdleTimer, clearTimers]);

  if (phase === "idle") return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          {t("message", { seconds: secondsLeft })}
        </p>
        {phase === "warning" ? (
          <div className="space-y-3">
            <button
              onClick={() => resetIdleTimer()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t("stayLoggedIn")}
            </button>

            <div className="flex gap-2">
              {EXTEND_OPTIONS_MINUTES.map((min) => (
                <button
                  key={min}
                  onClick={() => handleExtend(min)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t("extendMinutes", { minutes: min })}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("loggingOut")}
          </p>
        )}
      </div>
    </div>
  );
}
