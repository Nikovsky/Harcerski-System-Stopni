import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),

  AUTH_ISSUER: z.string().url(),
  AUTH_JWKS_URL: z.string().url(),
  AUTH_AUDIENCE: z.string().min(1),
  AUTH_RESOURCE_CLIENT_ID: z.string().min(1).default('hss-api'),
  AUTH_ALLOWED_ALGS: z.string().min(1).default('RS256'),
  AUTH_CLOCK_TOLERANCE_SECONDS: z.coerce.number().int().min(0).default(5),

  AUTH_ALLOWED_AZP: z.string().optional(), // csv
});

export type Env = z.infer<typeof envSchema>;
