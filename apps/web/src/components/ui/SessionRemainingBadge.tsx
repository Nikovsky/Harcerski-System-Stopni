// @file: apps/web/src/components/ui/SessionRemainingBadge.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { envPublic } from "@/config/env.client";

const CHANNEL_NAME = "hss-idle-timeout";
const SESSION_EXPIRES_AT_STORAGE_KEY = "hss.session.expiresAtMs";

type ChannelMessage =
  | { type: "reset"; durationSec: number }
  | { type: "logout" };

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function readStoredExpiresAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_EXPIRES_AT_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function SessionRemainingBadge() {
  const baseTimeoutSec = envPublic.NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS;
  const fallbackExpiresAtRef = useRef(Date.now() + baseTimeoutSec * 1_000);
  const [remainingSec, setRemainingSec] = useState(baseTimeoutSec);

  useEffect(() => {
    const syncRemaining = () => {
      const storedExpiresAt = readStoredExpiresAt();
      const effectiveExpiresAt = storedExpiresAt ?? fallbackExpiresAtRef.current;

      if (storedExpiresAt) {
        fallbackExpiresAtRef.current = storedExpiresAt;
      }

      const next = Math.max(0, Math.ceil((effectiveExpiresAt - Date.now()) / 1_000));
      setRemainingSec(next);
    };

    syncRemaining();
    const tick = setInterval(syncRemaining, 1_000);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        const message = event.data;
        if (message.type === "logout") {
          setRemainingSec(0);
          return;
        }

        if (message.type === "reset") {
          const expiresAt = Date.now() + Math.max(1, message.durationSec) * 1_000;
          fallbackExpiresAtRef.current = expiresAt;
          setRemainingSec(Math.max(0, message.durationSec));
          return;
        }
      };
    }

    return () => {
      clearInterval(tick);
      channel?.close();
    };
  }, [baseTimeoutSec]);

  return (
    <span className="rounded-full border border-neutral-300 bg-white/90 px-2 py-1 text-xs font-semibold tabular-nums text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200">
      Sesja: {formatClock(remainingSec)}
    </span>
  );
}
