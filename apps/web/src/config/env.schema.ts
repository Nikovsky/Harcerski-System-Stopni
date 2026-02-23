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

export const webPublicEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: zUrl,
    NEXT_PUBLIC_KEYCLOAK_ISSUER: zUrl,
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: z.string().min(1),

    NEXT_PUBLIC_SESSION_WARN_SECONDS: zIntPositive,
    NEXT_PUBLIC_SESSION_HARD_WARN_SECONDS: zIntPositive,
  })
  .refine(
    (v) => v.NEXT_PUBLIC_SESSION_WARN_SECONDS >= v.NEXT_PUBLIC_SESSION_HARD_WARN_SECONDS,
    {
      message: "NEXT_PUBLIC_SESSION_WARN_SECONDS must be >= NEXT_PUBLIC_SESSION_HARD_WARN_SECONDS",
      path: ["NEXT_PUBLIC_SESSION_WARN_SECONDS"],
    },
  );

export const webServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    DEBUG_BFF: zBool,

    HSS_API_BASE_URL: zUrl,
    HSS_WEB_ORIGIN: zUrl,

    AUTH_SECRET: z.string().min(32),
    AUTH_URL: zUrl,
    AUTH_TRUST_HOST: zBool,

    AUTH_KEYCLOAK_ID: z.string().min(1),
    AUTH_KEYCLOAK_ISSUER: zUrl,
    AUTH_KEYCLOAK_SECRET: z.string().min(1),
  })
  .merge(webPublicEnvSchema)
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