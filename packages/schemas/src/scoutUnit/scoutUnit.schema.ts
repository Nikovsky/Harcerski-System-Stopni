// @file: packages/schemas/src/scoutUnit/scoutUnit.schema.ts
import { z } from "zod";

import { statusSchema, unitTypeSchema } from "../enums.schema";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.iso.datetime();

export const getScoutUnitPathParamsSchema = z
  .object({
    scoutUnitUuid: uuidSchema,
  })
  .strict();

export const getScoutUnitResponseSchema = z
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

export type GetScoutUnitPathParams = z.infer<typeof getScoutUnitPathParamsSchema>;
export type GetScoutUnitResponse = z.infer<typeof getScoutUnitResponseSchema>;
