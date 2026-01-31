// @file: packages/schemas/src/zod/theme.schema.ts
import { z } from "zod";

export const uiThemeSchema = z.enum([
  "main",
  "danger",
  "warning",
  "success",
  "info",
  "secondary",
]);

export type UITheme = z.infer<typeof uiThemeSchema>;
