// @file: apps/api/src/helpers/role.helper.ts
import { UserRole } from "@hss/database";

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.ROOT]: 100,
  [UserRole.SYSTEM]: 90,
  [UserRole.ADMIN]: 80,
  [UserRole.COMMISSION_MEMBER]: 70,
  [UserRole.SCOUT]: 60,
  [UserRole.USER]: 50,
};

export function isHigherThanUser(role: UserRole): boolean {
  return ROLE_RANK[role] > ROLE_RANK[UserRole.USER];
}