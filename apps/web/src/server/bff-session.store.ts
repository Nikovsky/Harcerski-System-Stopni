// @file: apps/web/src/server/bff-session.store.ts
import "server-only";

import { randomBytes } from "node:crypto";
import type { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt";
import { z } from "zod";

import { envServer } from "@/config/env.server";
import { runRedisCommand } from "@/server/redis.client";
import { decryptSessionPayload, encryptSessionPayload } from "@/server/session.crypto";

const SESSION_RECORD_VERSION = 1;
const SESSION_SID_PATTERN = /^[A-Za-z0-9_-]{24,128}$/;

const releaseLockLua = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

const sessionRecordSchema = z
  .object({
    version: z.literal(SESSION_RECORD_VERSION),
    sid: z.string().regex(SESSION_SID_PATTERN),
    createdAtMs: z.number().int().positive(),
    lastSeenAtMs: z.number().int().positive(),
    idleExpiresAtMs: z.number().int().positive(),
    absoluteExpiresAtMs: z.number().int().positive(),
    userId: z.string().nullable(),
    userEmail: z.string().nullable(),
    tokenCiphertext: z.string().min(1),
  })
  .strict();

export type SessionJwt = JWT & {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  error?: "RefreshTokenExpired";
  hssSid?: string;
  hssSessionCreatedAtMs?: number;
  hssSessionAbsoluteExpiresAtMs?: number;
};

export type StoredSession = {
  sid: string;
  token: SessionJwt;
  createdAt: Date;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
};

export type SessionTouchResult = {
  touched: boolean;
  token: SessionJwt | null;
  idleExpiresAt: Date | null;
  absoluteExpiresAt: Date | null;
};

function sessionKey(sid: string): string {
  return `${envServer.HSS_SESSION_KEY_PREFIX}${sid}`;
}

function refreshLockKey(sid: string): string {
  return `${envServer.HSS_SESSION_KEY_PREFIX}lock:refresh:${sid}`;
}

function normalizeSessionSid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return SESSION_SID_PATTERN.test(trimmed) ? trimmed : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Math.floor(value);
}

function ttlFromExpirations(nowMs: number, idleExpiresAtMs: number, absoluteExpiresAtMs: number): number {
  const effectiveExpiry = Math.min(idleExpiresAtMs, absoluteExpiresAtMs);
  return Math.max(0, effectiveExpiry - nowMs);
}

function generateSid(): string {
  return randomBytes(32).toString("base64url");
}

function parseTokenFromCiphertext(ciphertext: string): SessionJwt | null {
  const plain = decryptSessionPayload(ciphertext);
  if (!plain) return null;

  try {
    const parsed = JSON.parse(plain) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as SessionJwt;
  } catch {
    return null;
  }
}

function toSessionJwtWithMeta(token: SessionJwt, record: z.infer<typeof sessionRecordSchema>): SessionJwt {
  return {
    ...token,
    hssSid: record.sid,
    hssSessionCreatedAtMs: record.createdAtMs,
    hssSessionAbsoluteExpiresAtMs: record.absoluteExpiresAtMs,
  };
}

function parseRecord(raw: string): z.infer<typeof sessionRecordSchema> | null {
  const parsed = sessionRecordSchema.safeParse(JSON.parse(raw) as unknown);
  return parsed.success ? parsed.data : null;
}

async function readRecord(sid: string): Promise<z.infer<typeof sessionRecordSchema> | null> {
  const raw = await runRedisCommand((redis) => redis.get(sessionKey(sid)));
  if (!raw) return null;

  try {
    const parsed = parseRecord(raw);
    if (!parsed) {
      await runRedisCommand((redis) => redis.del(sessionKey(sid)));
      return null;
    }
    return parsed;
  } catch {
    await runRedisCommand((redis) => redis.del(sessionKey(sid)));
    return null;
  }
}

async function writeRecord(record: z.infer<typeof sessionRecordSchema>): Promise<void> {
  const now = Date.now();
  const ttlMs = ttlFromExpirations(now, record.idleExpiresAtMs, record.absoluteExpiresAtMs);

  if (ttlMs <= 0) {
    await runRedisCommand((redis) => redis.del(sessionKey(record.sid)));
    return;
  }

  await runRedisCommand((redis) =>
    redis.set(sessionKey(record.sid), JSON.stringify(record), "PX", ttlMs),
  );
}

function resolveAbsoluteExpiresAtMs(token: SessionJwt, existing: z.infer<typeof sessionRecordSchema> | null, nowMs: number): number {
  const byToken = toPositiveNumber(token.hssSessionAbsoluteExpiresAtMs);
  if (byToken) {
    return byToken;
  }

  if (existing) {
    return existing.absoluteExpiresAtMs;
  }

  return nowMs + envServer.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1_000;
}

function resolveCreatedAtMs(token: SessionJwt, existing: z.infer<typeof sessionRecordSchema> | null, nowMs: number): number {
  const byToken = toPositiveNumber(token.hssSessionCreatedAtMs);
  if (byToken) return byToken;
  if (existing) return existing.createdAtMs;
  return nowMs;
}

function isRecordExpired(record: z.infer<typeof sessionRecordSchema>, nowMs: number): boolean {
  return record.idleExpiresAtMs <= nowMs || record.absoluteExpiresAtMs <= nowMs;
}

export async function encodeOpaqueSessionToken(params: JWTEncodeParams): Promise<string> {
  const token = params.token as SessionJwt | undefined;
  if (!token) return "";

  const sidFromToken = normalizeSessionSid(token.hssSid);
  const sid = sidFromToken ?? generateSid();
  const existing = await readRecord(sid);
  const now = Date.now();
  const createdAtMs = resolveCreatedAtMs(token, existing, now);
  const absoluteExpiresAtMs = resolveAbsoluteExpiresAtMs(token, existing, now);
  const idleExpiresAtMs = existing
    ? existing.idleExpiresAtMs
    : Math.min(now + envServer.HSS_SESSION_IDLE_TIMEOUT_SECONDS * 1_000, absoluteExpiresAtMs);

  const tokenWithMeta: SessionJwt = {
    ...token,
    hssSid: sid,
    hssSessionCreatedAtMs: createdAtMs,
    hssSessionAbsoluteExpiresAtMs: absoluteExpiresAtMs,
  };

  const record: z.infer<typeof sessionRecordSchema> = {
    version: SESSION_RECORD_VERSION,
    sid,
    createdAtMs,
    lastSeenAtMs: existing?.lastSeenAtMs ?? now,
    idleExpiresAtMs,
    absoluteExpiresAtMs,
    userId: toStringOrNull(tokenWithMeta.sub),
    userEmail: toStringOrNull(tokenWithMeta.email),
    tokenCiphertext: encryptSessionPayload(JSON.stringify(tokenWithMeta)),
  };

  await writeRecord(record);
  return sid;
}

export async function decodeOpaqueSessionToken(params: JWTDecodeParams): Promise<SessionJwt | null> {
  const sid = normalizeSessionSid(params.token);
  if (!sid) return null;

  const session = await readSessionBySid(sid);
  return session?.token ?? null;
}

export async function readSessionBySid(rawSid: string): Promise<StoredSession | null> {
  const sid = normalizeSessionSid(rawSid);
  if (!sid) return null;

  const record = await readRecord(sid);
  if (!record) return null;

  const now = Date.now();
  if (isRecordExpired(record, now)) {
    await destroySessionBySid(sid);
    return null;
  }

  const token = parseTokenFromCiphertext(record.tokenCiphertext);
  if (!token) {
    await destroySessionBySid(sid);
    return null;
  }

  return {
    sid: record.sid,
    token: toSessionJwtWithMeta(token, record),
    createdAt: new Date(record.createdAtMs),
    lastSeenAt: new Date(record.lastSeenAtMs),
    idleExpiresAt: new Date(record.idleExpiresAtMs),
    absoluteExpiresAt: new Date(record.absoluteExpiresAtMs),
  };
}

export async function touchSessionBySid(rawSid: string, extendSeconds?: number): Promise<SessionTouchResult> {
  const sid = normalizeSessionSid(rawSid);
  if (!sid) {
    return {
      touched: false,
      token: null,
      idleExpiresAt: null,
      absoluteExpiresAt: null,
    };
  }

  const record = await readRecord(sid);
  if (!record) {
    return {
      touched: false,
      token: null,
      idleExpiresAt: null,
      absoluteExpiresAt: null,
    };
  }

  const now = Date.now();
  if (isRecordExpired(record, now)) {
    await destroySessionBySid(sid);
    return {
      touched: false,
      token: null,
      idleExpiresAt: null,
      absoluteExpiresAt: null,
    };
  }

  const token = parseTokenFromCiphertext(record.tokenCiphertext);
  if (!token) {
    await destroySessionBySid(sid);
    return {
      touched: false,
      token: null,
      idleExpiresAt: null,
      absoluteExpiresAt: null,
    };
  }

  const extensionMs = (() => {
    const byRequest = toPositiveNumber(extendSeconds);
    if (byRequest) {
      return Math.min(byRequest, envServer.HSS_SESSION_MAX_EXTENSION_SECONDS) * 1_000;
    }
    return envServer.HSS_SESSION_IDLE_TIMEOUT_SECONDS * 1_000;
  })();

  const throttleMs = envServer.HSS_SESSION_TOUCH_THROTTLE_SECONDS * 1_000;
  const withinThrottle = now - record.lastSeenAtMs < throttleMs;
  const hasExplicitExtension = toPositiveNumber(extendSeconds) !== null;

  if (withinThrottle && !hasExplicitExtension) {
    return {
      touched: false,
      token: toSessionJwtWithMeta(token, record),
      idleExpiresAt: new Date(record.idleExpiresAtMs),
      absoluteExpiresAt: new Date(record.absoluteExpiresAtMs),
    };
  }

  const nextIdleExpiresAtMs = Math.min(
    now + Math.max(1_000, extensionMs),
    record.absoluteExpiresAtMs,
  );

  const nextRecord: z.infer<typeof sessionRecordSchema> = {
    ...record,
    lastSeenAtMs: now,
    idleExpiresAtMs: nextIdleExpiresAtMs,
    userId: toStringOrNull(token.sub),
    userEmail: toStringOrNull(token.email),
  };

  await writeRecord(nextRecord);

  return {
    touched: true,
    token: toSessionJwtWithMeta(token, nextRecord),
    idleExpiresAt: new Date(nextRecord.idleExpiresAtMs),
    absoluteExpiresAt: new Date(nextRecord.absoluteExpiresAtMs),
  };
}

export async function destroySessionBySid(rawSid: string): Promise<void> {
  const sid = normalizeSessionSid(rawSid);
  if (!sid) return;
  await runRedisCommand((redis) => redis.del(sessionKey(sid)));
}

export async function acquireSessionRefreshLock(rawSid: string): Promise<string | null> {
  const sid = normalizeSessionSid(rawSid);
  if (!sid) return null;

  const lockValue = randomBytes(24).toString("base64url");
  const result = await runRedisCommand((redis) =>
    redis.set(
      refreshLockKey(sid),
      lockValue,
      "PX",
      envServer.HSS_SESSION_REFRESH_LOCK_TTL_MS,
      "NX",
    ),
  );

  return result === "OK" ? lockValue : null;
}

export async function releaseSessionRefreshLock(rawSid: string, lockValue: string): Promise<void> {
  const sid = normalizeSessionSid(rawSid);
  if (!sid) return;

  await runRedisCommand((redis) =>
    redis.eval(releaseLockLua, 1, refreshLockKey(sid), lockValue),
  );
}

export function extractSessionSid(token: SessionJwt | null | undefined): string | null {
  if (!token) return null;
  return normalizeSessionSid(token.hssSid);
}

export function normalizeSessionSidFromCookie(value: string | undefined): string | null {
  return normalizeSessionSid(value);
}
