// @file: apps/web/src/lib/server/redis.client.ts
import "server-only";

import Redis from "ioredis";

import { envServer } from "@/config/env.server";

declare global {
  var __hssRedisClient: Redis | undefined;
  var __hssRedisReadyPromise: Promise<Redis> | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis(envServer.HSS_REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    enableReadyCheck: false,
    connectTimeout: envServer.HSS_REDIS_CONNECT_TIMEOUT_MS,
    commandTimeout: envServer.HSS_REDIS_COMMAND_TIMEOUT_MS,
  });

  client.on("error", (error) => {
    if (envServer.NODE_ENV !== "production") {
      console.error("[redis] client error:", error);
      return;
    }

    console.error("[redis] client error");
  });

  return client;
}

function readyTimeoutMs(): number {
  return Math.max(
    3_000,
    envServer.HSS_REDIS_CONNECT_TIMEOUT_MS + envServer.HSS_REDIS_COMMAND_TIMEOUT_MS,
  );
}

async function waitForClientReady(client: Redis): Promise<Redis> {
  if (client.status === "ready") return client;

  const timeoutMs = readyTimeoutMs();

  return new Promise<Redis>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`[redis] ready timeout after ${timeoutMs}ms (status=${client.status})`));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve(client);
    };

    const onError = (error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new Error("[redis] unknown client error before ready"));
    };

    const onEnd = () => {
      cleanup();
      reject(new Error("[redis] connection ended before ready"));
    };

    const cleanup = () => {
      clearTimeout(timer);
      client.off("ready", onReady);
      client.off("error", onError);
      client.off("end", onEnd);
    };

    client.once("ready", onReady);
    client.once("error", onError);
    client.once("end", onEnd);
  });
}

async function ensureClientReady(client: Redis): Promise<Redis> {
  if (client.status === "ready") return client;

  if (client.status === "wait") {
    await client.connect();
  }

  return waitForClientReady(client);
}

export async function getRedisClient(): Promise<Redis> {
  if (!globalThis.__hssRedisClient || globalThis.__hssRedisClient.status === "end") {
    globalThis.__hssRedisClient = createRedisClient();
    globalThis.__hssRedisReadyPromise = undefined;
  }

  const client = globalThis.__hssRedisClient;
  if (client.status === "ready") return client;

  if (!globalThis.__hssRedisReadyPromise) {
    globalThis.__hssRedisReadyPromise = ensureClientReady(client).catch((error) => {
      globalThis.__hssRedisReadyPromise = undefined;
      throw error;
    });
  }

  return globalThis.__hssRedisReadyPromise;
}
