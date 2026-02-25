// @file: packages/schemas/src/auth.schema.ts
import { z } from "zod";

const uuidSchema = z.string().uuid();
const emailSchema = z.email();

export const AuthPrincipalSchema = z.object({
  sub: uuidSchema,
  email: emailSchema.nullable().optional(),
  preferredUsername: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  realmRoles: z.array(z.string()).default([]),
  clientRoles: z.array(z.string()).default([]),
}).strict();

export const GetBackendHealthResponseSchema = z.object({
  ok: z.literal(true),
}).strict();

// single source of truth:
export type AuthPrincipal = z.infer<typeof AuthPrincipalSchema>;
export type GetBackendHealthResponse = z.infer<typeof GetBackendHealthResponseSchema>;

// if you want "Dto" naming:
export type AuthPrincipalDto = AuthPrincipal;
