// @file: apps/web/src/lib/server/redis.client.ts
import "server-only";

import Redis from "ioredis";

import { envServer } from "@/config/env.server";

declare global {
  var __hssRedisClient: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis(envServer.HSS_REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
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

export function getRedisClient(): Redis {
  if (!globalThis.__hssRedisClient) {
    globalThis.__hssRedisClient = createRedisClient();
  }

  return globalThis.__hssRedisClient;
}
