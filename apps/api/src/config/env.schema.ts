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

export const envSchema = z.object({
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

  // ===[MINIO / S3]===
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1).default('hss'),
  MINIO_REGION: z.string().min(1).default('us-east-1'),
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
});

export type Env = z.infer<typeof envSchema>;
