// @file: apps/web/src/server/rate-limit.ts
import "server-only";

import { runRedisCommand } from "@/server/redis.client";

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
};

function sanitizeToken(value: string): string {
  return value.replace(/[^A-Za-z0-9._:-]/g, "_");
}

export function buildRateLimitKey(scope: string, identifier: string): string {
  return `hss:rl:${sanitizeToken(scope)}:${sanitizeToken(identifier)}`;
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const result = (await runRedisCommand((redis) =>
    redis.eval(RATE_LIMIT_SCRIPT, 1, key, String(windowMs)),
  )) as [number | string, number | string];

  const current = Number(result?.[0] ?? 0);
  const ttl = Number(result?.[1] ?? 0);
  const resetMs = ttl > 0 ? ttl : windowMs;

  return {
    allowed: current <= limit,
    limit,
    remaining: Math.max(0, limit - current),
    resetMs,
  };
}
