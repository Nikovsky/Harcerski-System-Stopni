// @file: apps/web/src/components/instructor-application/instructor-application.constants.ts
import {
  instructorRankSchema,
  presenceTypeSchema,
  scoutRankSchema,
} from "@hss/schemas";

export const SCOUT_RANK_VALUES = scoutRankSchema.options;

export const PRESENCE_VALUES = presenceTypeSchema.options;

export const INSTRUCTOR_RANK_VALUES = instructorRankSchema.options;

export const BASIC_DEGREES = new Set(["PWD", "PHM"]);
