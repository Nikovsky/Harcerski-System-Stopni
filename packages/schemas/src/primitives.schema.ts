// @file: packages/schemas/src/primitives.schema.ts
import { z } from "zod";

export const uuidSchema = z.uuid();
export const emailSchema = z.email();
export const isoDateTimeSchema = z.iso.datetime();
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const bigIntStringSchema = z.string().regex(/^\d+$/);
export const passwordSchema = z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/);
