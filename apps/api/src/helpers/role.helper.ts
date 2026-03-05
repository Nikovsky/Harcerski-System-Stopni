// @file: apps/api/src/helpers/role.helper.ts
import { UserRole } from '@hss/database';
import { ROLE_RANK, type UserRole as SchemaUserRole } from '@hss/schemas';

function toSchemaUserRole(role: UserRole): SchemaUserRole {
  return role as unknown as SchemaUserRole;
}

export function isHigherThanUser(role: UserRole): boolean {
  return (
    ROLE_RANK[toSchemaUserRole(role)] >
    ROLE_RANK[toSchemaUserRole(UserRole.USER)]
  );
}
