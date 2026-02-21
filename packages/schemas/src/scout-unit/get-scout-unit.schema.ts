// @file: packages/schemas/src/scout-unit/get-scout-unit.schema.ts
import { z } from "zod";

import { statusSchema, unitTypeSchema } from "../enums.schema";
import { isoDateTimeSchema, uuidSchema } from "../primitives.schema";

export const scoutUnitGetPathParamsSchema = z
  .object({
    scoutUnitUuid: uuidSchema,
  })
  .strict();

export const scoutUnitGetResponseSchema = z
  .object({
    uuid: uuidSchema,
    code: z.string().max(32).nullable(),
    name: z.string().max(128).nullable(),
    type: unitTypeSchema.nullable(),
    parentHufiecCode: z.string().max(32).nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    status: statusSchema,
  })
  .strict();

export type ScoutUnitGetPathParams = z.infer<typeof scoutUnitGetPathParamsSchema>;
export type ScoutUnitGetResponse = z.infer<typeof scoutUnitGetResponseSchema>;
