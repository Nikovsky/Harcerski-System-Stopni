// @file: apps/api/src/helpers/role.helper.ts
import { ROLE_RANK, type AuthPrincipal, type UserRole } from '@hss/schemas';

const USER_ROLES = Object.keys(ROLE_RANK) as UserRole[];

export function resolveHighestUserRole(principal: AuthPrincipal): UserRole {
  const assignedRoles = new Set([
    ...principal.realmRoles,
    ...principal.clientRoles,
  ]);

  return USER_ROLES.reduce<UserRole>((highest, candidate) => {
    if (!assignedRoles.has(candidate)) return highest;
    return ROLE_RANK[candidate] > ROLE_RANK[highest] ? candidate : highest;
  }, 'USER');
}

export function isHigherThanUser(principal: AuthPrincipal): boolean {
  return ROLE_RANK[resolveHighestUserRole(principal)] > ROLE_RANK.USER;
}
