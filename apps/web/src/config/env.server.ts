// @file: apps/web/src/config/env.server.ts
import "server-only";
import { ZodError } from "zod";
import { webServerEnvSchema, type WebServerEnv } from "./env.schema";

function formatZodError(e: ZodError): string {
  return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

/**
 * Server env (contains secrets) — NEVER import this file in Client Components.
 * Fail-fast with safe message (no values).
 */
const parsed = webServerEnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`[env] Invalid server environment: ${formatZodError(parsed.error)}`);
}

export const envServer: WebServerEnv = parsed.data;