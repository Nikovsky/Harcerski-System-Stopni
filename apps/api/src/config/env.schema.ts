// @file: apps/api/src/config/env.schema.ts
import { z } from 'zod';

const toBool = (v: unknown, def = false): boolean => {
  if (v === undefined || v === null || v === '') return def;
  if (
    typeof v !== 'string' &&
    typeof v !== 'number' &&
    typeof v !== 'boolean'
  ) {
    return def;
  }
  const s = `${v}`.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return def;
};

const toCsv = (v: unknown): string[] => {
  if (v === undefined || v === null) return [];
  if (
    typeof v !== 'string' &&
    typeof v !== 'number' &&
    typeof v !== 'boolean'
  ) {
    return [];
  }
  const s = `${v}`.trim();
  if (!s) return [];
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
};

const url = z.string().url();
const positiveInteger = z.coerce.number().int().positive();
const redisUrl = url.refine(
  (value) => value.startsWith('redis://') || value.startsWith('rediss://'),
  'Expected a Redis URL (redis:// or rediss://)',
);
const bucketName = z
  .string()
  .min(3)
  .max(63)
  .regex(
    /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/,
    'MINIO_BUCKET/MINIO_BUCKET_NAME must use [a-z0-9.-] and start/end with alphanumeric',
  );
const regionName = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9-]+$/,
    'MINIO_REGION must use lowercase letters, numbers, and hyphens only',
  );

export const envSchema = z
  .object({
    // ===[APP]===
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    APP_NAME: z.string().min(1).default('hss-api'),
    APP_HOST: z.string().min(1).default('0.0.0.0'),
    APP_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    APP_URL: url,

    // CORS
    // CORS_ORIGIN: z.string().optional(), // legacy / single
    CORS_ORIGINS: z.preprocess(toCsv, z.array(url).default([])),

    // DB
    DATABASE_URL: z
      .string()
      .min(1)
      .refine(
        (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
        'DATABASE_URL must be a PostgreSQL connection string',
      ),

    // ===[BETTER AUTH | BFF]===
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: url,
    HSS_BFF_INTERNAL_SECRET: z.string().min(32),
    HSS_SESSION_COOKIE_NAME: z
      .string()
      .regex(/^(?:__Host-|__Secure-)?[A-Za-z0-9._-]+$/),
    HSS_SESSION_KEY_PREFIX: z.string().min(1),
    HSS_SESSION_IDLE_TIMEOUT_SECONDS: positiveInteger,
    HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS: positiveInteger,
    HSS_SESSION_TOUCH_THROTTLE_SECONDS: positiveInteger,
    HSS_SESSION_MAX_EXTENSION_SECONDS: positiveInteger,
    HSS_SESSION_REFRESH_LOCK_TTL_MS: positiveInteger,
    HSS_REDIS_URL: redisUrl,
    HSS_REDIS_CONNECT_TIMEOUT_MS: positiveInteger,
    HSS_REDIS_COMMAND_TIMEOUT_MS: positiveInteger,
    AUTH_KEYCLOAK_ID: z.string().min(1),
    AUTH_KEYCLOAK_SECRET: z.string().min(1),

    // ===[KEYCLOAK | REALM / ISSUER]===
    KEYCLOAK_REALM: z.string().min(1),
    KEYCLOAK_ISSUER: url,
    KEYCLOAK_JWKS_URL: url,
    KEYCLOAK_AUDIENCE: z.string().min(1),

    // Optional (can be derived from issuer)
    KEYCLOAK_TOKEN_URL: url.optional(),

    // ===[KEYCLOAK | CLIENT (M2M OPTIONAL)]===
    KEYCLOAK_API_CLIENT_ID: z.string().min(1).optional(),
    KEYCLOAK_API_CLIENT_SECRET: z.string().min(1).optional(),

    // ===[STORAGE | MINIO / S3]===
    MINIO_ENDPOINT: z.string().min(1),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    MINIO_REGION: regionName.default('eu-central-1'),
    MINIO_BUCKET: bucketName.optional().default('hss'),
    MINIO_BUCKET_NAME: bucketName.optional(),
    MINIO_USE_SSL: z.preprocess(
      (v) => toBool(v, false),
      z.boolean().default(false),
    ),
    MINIO_PUBLIC_ENDPOINT: z.string().optional().default(''),

    // ===[SECURITY / RUNTIME]===
    TRUST_PROXY: z.preprocess(
      (v) => toBool(v, false),
      z.boolean().default(false),
    ),
  })
  .superRefine((env, ctx) => {
    if (
      env.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS <=
      env.HSS_SESSION_IDLE_TIMEOUT_SECONDS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS'],
        message:
          'HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS must be greater than the idle timeout.',
      });
    }

    if (env.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS > 8 * 60 * 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS'],
        message:
          'HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS must not exceed 8 hours.',
      });
    }

    if (
      env.HSS_SESSION_MAX_EXTENSION_SECONDS >
      env.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['HSS_SESSION_MAX_EXTENSION_SECONDS'],
        message:
          'HSS_SESSION_MAX_EXTENSION_SECONDS exceeds the absolute timeout.',
      });
    }

    if (new URL(env.BETTER_AUTH_URL).protocol !== 'https:') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['BETTER_AUTH_URL'],
        message: 'BETTER_AUTH_URL must use HTTPS.',
      });
    }

    if (
      env.NODE_ENV === 'production' &&
      env.MINIO_ENDPOINT.startsWith('http://')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MINIO_ENDPOINT'],
        message: 'MINIO_ENDPOINT must not use http:// in production.',
      });
    }

    const hasApiClientId = Boolean(env.KEYCLOAK_API_CLIENT_ID);
    const hasApiClientSecret = Boolean(env.KEYCLOAK_API_CLIENT_SECRET);
    if (hasApiClientId !== hasApiClientSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['KEYCLOAK_API_CLIENT_ID'],
        message:
          'KEYCLOAK_API_CLIENT_ID and KEYCLOAK_API_CLIENT_SECRET must be provided together.',
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['KEYCLOAK_API_CLIENT_SECRET'],
        message:
          'KEYCLOAK_API_CLIENT_ID and KEYCLOAK_API_CLIENT_SECRET must be provided together.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
