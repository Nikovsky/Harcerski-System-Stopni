// @file: apps/web/src/config/env.client.ts
import { ZodError } from "zod";
import { webPublicEnvSchema, WebPublicEnv } from "./env.schema";

function formatZodError(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

/**
 * Public env only (NEXT_PUBLIC_*) — safe to import in client code.
 */
const parsed = webPublicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_KEYCLOAK_ISSUER: process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER,
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
  NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS: process.env.NEXT_PUBLIC_SESSION_TIMEOUT_SECONDS,
  NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS: process.env.NEXT_PUBLIC_SESSION_PROMPT_BEFORE_EXPIRY_SECONDS,
  NEXT_PUBLIC_SESSION_EXTEND_OPTIONS_MINUTES: process.env.NEXT_PUBLIC_SESSION_EXTEND_OPTIONS_MINUTES,
  NEXT_PUBLIC_SESSION_AUTH_CHECK_INTERVAL_SECONDS: process.env.NEXT_PUBLIC_SESSION_AUTH_CHECK_INTERVAL_SECONDS,
});

if (!parsed.success) {
  // In client bundle this is still safe: no secrets, no values.
  throw new Error(`[env] Invalid public environment: ${formatZodError(parsed.error)}`);
}

export const envPublic: WebPublicEnv = parsed.data;
