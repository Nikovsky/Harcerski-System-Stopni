// @file: packages/schemas/src/zod/theme.schema.ts
import { z } from "zod";

export const uiThemeSchema = z.enum([
  "main",
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "danger",
  "light",
  "dark",
]);

export type UITheme = z.infer<typeof uiThemeSchema>;
