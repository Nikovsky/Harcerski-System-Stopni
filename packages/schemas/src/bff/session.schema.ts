// @file: packages/schemas/src/bff/session.schema.ts
import { z } from "zod";

const requestIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9._:-]{8,128}$/, "requestId has invalid format");

const isoDateTimeSchema = z.iso.datetime();

export const bffErrorCodeSchema = z.enum([
  "FORBIDDEN",
  "INVALID_REQUEST",
  "AUTHENTICATION_REQUIRED",
  "SESSION_EXPIRED",
  "SERVER_MISCONFIGURED",
  "BAD_GATEWAY",
]);

export const bffErrorResponseSchema = z
  .object({
    code: bffErrorCodeSchema,
    message: z.string().min(1),
    requestId: requestIdSchema,
  })
  .strict();

export const bffSessionStatusResponseSchema = z
  .object({
    authenticated: z.boolean(),
    idleExpiresAt: isoDateTimeSchema.nullable(),
    absoluteExpiresAt: isoDateTimeSchema.nullable(),
    requestId: requestIdSchema.optional(),
  })
  .strict();

export const bffSessionTouchRequestSchema = z
  .object({
    extendSeconds: z.number().int().positive().max(24 * 60 * 60).optional(),
  })
  .strict();

export const bffSessionTouchResponseSchema = z
  .object({
    touched: z.boolean(),
    idleExpiresAt: isoDateTimeSchema.nullable(),
    absoluteExpiresAt: isoDateTimeSchema.nullable(),
    requestId: requestIdSchema,
  })
  .strict();

export type BffErrorCode = z.infer<typeof bffErrorCodeSchema>;
export type BffErrorResponse = z.infer<typeof bffErrorResponseSchema>;
export type BffSessionStatusResponse = z.infer<typeof bffSessionStatusResponseSchema>;
export type BffSessionTouchRequest = z.infer<typeof bffSessionTouchRequestSchema>;
export type BffSessionTouchResponse = z.infer<typeof bffSessionTouchResponseSchema>;
