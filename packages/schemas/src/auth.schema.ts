// @file: packages/schemas/src/zod/auth.schema.ts
import { z } from "zod";
import { emailSchema, uuidSchema } from "./primitives.schema";

export const AuthPrincipalSchema = z.object({
  sub: uuidSchema,
  email: emailSchema.nullable().optional(),
  preferredUsername: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  realmRoles: z.array(z.string()).default([]),
  clientRoles: z.array(z.string()).default([]),
}).strict();

// single source of truth:
export type AuthPrincipal = z.infer<typeof AuthPrincipalSchema>;

// if you want "Dto" naming:
export type AuthPrincipalDto = AuthPrincipal;
