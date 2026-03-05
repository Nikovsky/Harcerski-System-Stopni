// @file: apps/web/src/server/rbac.ts
import "server-only";
import type { Session } from "next-auth";
import { ROLE_RANK, userRoleSchema, type UserRole } from "@hss/schemas";

function normalizeRole(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRoleList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const roles: string[] = [];
  const seen = new Set<string>();
  for (const role of value) {
    const normalized = normalizeRole(role);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    roles.push(normalized);
  }

  return roles;
}

export function getSessionRoles(session: Session | null): Set<string> {
  const realmRoles = normalizeRoleList(session?.realmRoles);
  const clientRoles = normalizeRoleList(session?.clientRoles);
  return new Set([...realmRoles, ...clientRoles]);
}

function hasLoggedSession(session: Session | null): boolean {
  return Boolean(session?.user && session.accessToken);
}

function toUserRole(value: string): UserRole | null {
  const parsed = userRoleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function getHighestRoleRank(session: Session | null): number | null {
  const roleSet = getSessionRoles(session);
  let highest: number | null = null;

  for (const role of roleSet) {
    const userRole = toUserRole(role);
    if (!userRole) continue;

    const rank = ROLE_RANK[userRole];
    if (highest === null || rank > highest) {
      highest = rank;
    }
  }

  return highest;
}

export function canAccess(session: Session | null, minRank?: number): boolean {
  if (!hasLoggedSession(session)) return false;
  if (typeof minRank !== "number") return true;

  const highestRank = getHighestRoleRank(session);
  if (highestRank === null) return false;

  return highestRank >= minRank;
}

function normalizeCallbackPath(callbackPath: string): string {
  return callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
}

export function buildKeycloakSignInHref(locale: string, callbackPath: string): string {
  const normalizedLocale = locale === "en" ? "en" : "pl";
  const params = new URLSearchParams({
    locale: normalizedLocale,
    callbackPath: normalizeCallbackPath(callbackPath),
  });

  return `/api/auth/login?${params.toString()}`;
}
