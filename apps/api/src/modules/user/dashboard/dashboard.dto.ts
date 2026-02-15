// @file: apps/api/src/modules/user/dashboard/dashboard.dto.ts
import type { UserDashboardResponse } from "@hss/schemas";
import type { AuthPrincipal } from "@hss/schemas";

export type UserDashboardDto = UserDashboardResponse;
export type DashboardAuthUser = AuthPrincipal;

export type UpdateUserDashboardProfileDto = {
  firstName?: string | null;
  secondName?: string | null;
  surname?: string | null;
  phone?: string | null;

  birthDate?: Date | null;

  hufiecCode?: string | null;
  druzynaCode?: string | null;
};