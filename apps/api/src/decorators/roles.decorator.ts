// @file: apps/api/src/decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@hss/database";

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);