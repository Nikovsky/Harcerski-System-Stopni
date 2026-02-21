// @file: packages/schemas/src/models/_shared.schema.ts
import { z } from "zod";

export const baseGetAllQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const createGetAllResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z
    .object({
      items: z.array(itemSchema),
      total: z.number().int().min(0),
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(100),
    })
    .strict();
