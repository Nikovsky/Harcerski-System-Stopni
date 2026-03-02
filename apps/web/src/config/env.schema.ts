// @file: apps/web/src/config/env.schema.ts
import { z } from "zod";

const zBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return v;
  const s = v.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return v;
}, z.boolean());

const zInt = z.preprocess((v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return v;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : v;
}, z.number().int());

const zIntPositive = zInt.pipe(z.number().int().positive());

const zUrl = z.string().url();
const zRedisUrl = zUrl.refine(
  (v) => v.startsWith("redis://") || v.startsWith("rediss://"),
  { message: "Expected a Redis URL (redis:// or rediss://)" },
);

export const webPublicEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: zUrl,
    NEXT_PUBLIC_KEYCLOAK_ISSUER: zUrl,
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: z.string().min(1),

    NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS: zIntPositive,
    NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS: zIntPositive,
    NEXT_PUBLIC_SESSION_EXTEND_OPTIONS_MINUTES: z
      .string()
      .regex(/^\d+(,\d+)*$/, "NEXT_PUBLIC_SESSION_EXTEND_OPTIONS_MINUTES must be a CSV list of integers"),
    NEXT_PUBLIC_SESSION_AUTH_CHECK_INTERVAL_SECONDS: zIntPositive,
  })
  .refine(
    (v) => v.NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS > v.NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS,
    {
      message: "NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS must be > NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS",
      path: ["NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS"],
    },
  )
  .refine(
    (v) => v.NEXT_PUBLIC_SESSION_AUTH_CHECK_INTERVAL_SECONDS <= v.NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS,
    {
      message: "NEXT_PUBLIC_SESSION_AUTH_CHECK_INTERVAL_SECONDS should be <= NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS",
      path: ["NEXT_PUBLIC_SESSION_AUTH_CHECK_INTERVAL_SECONDS"],
    },
  );

export const webServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    DEBUG_BFF: zBool,

    HSS_API_BASE_URL: zUrl,
    HSS_WEB_ORIGIN: zUrl,
    HSS_REDIS_URL: zRedisUrl,
    HSS_REDIS_CONNECT_TIMEOUT_MS: zIntPositive,
    HSS_REDIS_COMMAND_TIMEOUT_MS: zIntPositive,
    HSS_RATE_LIMIT_BFF_WINDOW_MS: zIntPositive,
    HSS_RATE_LIMIT_BFF_MAX: zIntPositive,
    HSS_RATE_LIMIT_SESSION_TOUCH_WINDOW_MS: zIntPositive,
    HSS_RATE_LIMIT_SESSION_TOUCH_MAX: zIntPositive,
    HSS_RATE_LIMIT_LOGOUT_WINDOW_MS: zIntPositive,
    HSS_RATE_LIMIT_LOGOUT_MAX: zIntPositive,
    HSS_RATE_LIMIT_NEXTAUTH_WINDOW_MS: zIntPositive,
    HSS_RATE_LIMIT_NEXTAUTH_MAX: zIntPositive,
    HSS_SESSION_COOKIE_NAME: z.string().regex(
      /^(?:__Host-|__Secure-)?[A-Za-z0-9._-]+$/,
      "HSS_SESSION_COOKIE_NAME has invalid format",
    ),
    HSS_SESSION_KEY_PREFIX: z.string().min(1),
    HSS_SESSION_IDLE_TIMEOUT_SECONDS: zIntPositive,
    HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS: zIntPositive,
    HSS_SESSION_TOUCH_THROTTLE_SECONDS: zIntPositive,
    HSS_SESSION_MAX_EXTENSION_SECONDS: zIntPositive,
    HSS_SESSION_REFRESH_LOCK_TTL_MS: zIntPositive,
    HSS_SESSION_ENCRYPTION_KEY: z.string().min(32),

    AUTH_SECRET: z.string().min(32),
    AUTH_URL: zUrl,
    AUTH_TRUST_HOST: zBool,

    AUTH_KEYCLOAK_ID: z.string().min(1),
    AUTH_KEYCLOAK_ISSUER: zUrl,
    AUTH_KEYCLOAK_SECRET: z.string().min(1),
  })
  .merge(webPublicEnvSchema)
  .refine(
    (v) => v.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS > v.HSS_SESSION_IDLE_TIMEOUT_SECONDS,
    {
      message:
        "HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS must be > HSS_SESSION_IDLE_TIMEOUT_SECONDS",
      path: ["HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS"],
    },
  )
  .refine(
    (v) => v.HSS_SESSION_TOUCH_THROTTLE_SECONDS <= v.HSS_SESSION_IDLE_TIMEOUT_SECONDS,
    {
      message:
        "HSS_SESSION_TOUCH_THROTTLE_SECONDS should be <= HSS_SESSION_IDLE_TIMEOUT_SECONDS",
      path: ["HSS_SESSION_TOUCH_THROTTLE_SECONDS"],
    },
  )
  .refine(
    (v) => v.HSS_SESSION_MAX_EXTENSION_SECONDS <= v.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS,
    {
      message:
        "HSS_SESSION_MAX_EXTENSION_SECONDS must be <= HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS",
      path: ["HSS_SESSION_MAX_EXTENSION_SECONDS"],
    },
  )
  .refine(
    (v) => v.HSS_SESSION_MAX_EXTENSION_SECONDS >= v.HSS_SESSION_IDLE_TIMEOUT_SECONDS,
    {
      message:
        "HSS_SESSION_MAX_EXTENSION_SECONDS should be >= HSS_SESSION_IDLE_TIMEOUT_SECONDS",
      path: ["HSS_SESSION_MAX_EXTENSION_SECONDS"],
    },
  )
  .refine(
    (v) => v.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS <= 8 * 60 * 60,
    {
      message: "HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS must be <= 28800 (8h)",
      path: ["HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS"],
    },
  )
  .refine(
    (v) => {
      const cookie = v.HSS_SESSION_COOKIE_NAME;
      if (!cookie.startsWith("__Host-") && !cookie.startsWith("__Secure-")) return true;
      return new URL(v.HSS_WEB_ORIGIN).protocol === "https:";
    },
    {
      message:
        "HSS_SESSION_COOKIE_NAME with __Host- or __Secure- prefix requires HTTPS HSS_WEB_ORIGIN",
      path: ["HSS_SESSION_COOKIE_NAME"],
    },
  )
  .refine((v) => new URL(v.AUTH_URL).origin === new URL(v.HSS_WEB_ORIGIN).origin, {
    message: "AUTH_URL must match HSS_WEB_ORIGIN (same origin)",
    path: ["AUTH_URL"],
  })
  .refine((v) => new URL(v.NEXT_PUBLIC_APP_URL).origin === new URL(v.HSS_WEB_ORIGIN).origin, {
    message: "NEXT_PUBLIC_APP_URL must match HSS_WEB_ORIGIN (same origin)",
    path: ["NEXT_PUBLIC_APP_URL"],
  });

export type WebPublicEnv = z.infer<typeof webPublicEnvSchema>;
export type WebServerEnv = z.infer<typeof webServerEnvSchema>;
