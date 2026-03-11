// @file: apps/web/src/server/rbac.ts
import "server-only";
import type { Session } from "next-auth";
import {
  AuthPrincipalSchema,
  ROLE_RANK,
  userRoleSchema,
  type AuthPrincipal,
  type UserRole,
} from "@hss/schemas";
import { envServer } from "@/config/env.server";

const API_BASE_URL = envServer.HSS_API_BASE_URL.replace(/\/$/, "");
const KEYCLOAK_CLIENT_ID = envServer.AUTH_KEYCLOAK_ID;

export type VerifiedPrincipalState =
  | { status: "authenticated"; principal: AuthPrincipal }
  | { status: "unauthenticated"; principal: null }
  | { status: "unavailable"; principal: null };

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

function getSessionAccessToken(session: Session | null): string | null {
  if (!session?.accessToken) return null;
  if (typeof session.accessToken !== "string") return null;
  if (!session.accessToken.trim()) return null;
  return session.accessToken;
}

type KeycloakTokenClaims = {
  realm_access?: { roles?: unknown };
  resource_access?: Record<string, { roles?: unknown }>;
};

function decodeJwtClaims(token: string | null): KeycloakTokenClaims | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1] ?? "", "base64url").toString("utf8"),
    ) as unknown;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    return payload as KeycloakTokenClaims;
  } catch {
    return null;
  }
}

function buildFallbackPrincipal(session: Session | null): AuthPrincipal | null {
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) {
    return null;
  }

  const accessToken = getSessionAccessToken(session);
  const tokenClaims = decodeJwtClaims(accessToken);
  const tokenRealmRoles = normalizeRoleList(tokenClaims?.realm_access?.roles);
  const tokenClientRoles = normalizeRoleList(
    tokenClaims?.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles,
  );

  const candidate = {
    sub: userId,
    email: session?.user?.email ?? null,
    preferredUsername: null,
    name: session?.user?.name ?? null,
    realmRoles:
      tokenRealmRoles.length > 0
        ? tokenRealmRoles
        : normalizeRoleList(session?.realmRoles),
    clientRoles:
      tokenClientRoles.length > 0
        ? tokenClientRoles
        : normalizeRoleList(session?.clientRoles),
  };

  const parsed = AuthPrincipalSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

async function fetchVerifiedPrincipalByAccessToken(accessToken: string): Promise<VerifiedPrincipalState> {
  try {
    const res = await fetch(`${API_BASE_URL}/profile/principal`, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      return { status: "unauthenticated", principal: null };
    }
    if (!res.ok) {
      return { status: "unavailable", principal: null };
    }

    const payload = await res.json().catch(() => null);
    const parsed = AuthPrincipalSchema.safeParse(payload);
    if (!parsed.success) {
      return { status: "unavailable", principal: null };
    }

    return { status: "authenticated", principal: parsed.data };
  } catch {
    return { status: "unavailable", principal: null };
  }
}

export async function resolveVerifiedPrincipal(session: Session | null): Promise<VerifiedPrincipalState> {
  const accessToken = getSessionAccessToken(session);
  const fallbackPrincipal = buildFallbackPrincipal(session);

  if (!accessToken) {
    return fallbackPrincipal
      ? { status: "authenticated", principal: fallbackPrincipal }
      : { status: "unauthenticated", principal: null };
  }

  const resolved = await fetchVerifiedPrincipalByAccessToken(accessToken);
  if (resolved.status === "unavailable" && fallbackPrincipal) {
    return { status: "authenticated", principal: fallbackPrincipal };
  }

  return resolved;
}

export async function getVerifiedPrincipal(session: Session | null): Promise<AuthPrincipal | null> {
  const resolved = await resolveVerifiedPrincipal(session);
  return resolved.status === "authenticated" ? resolved.principal : null;
}

export function getPrincipalRoles(principal: AuthPrincipal | null): Set<string> {
  const realmRoles = normalizeRoleList(principal?.realmRoles);
  const clientRoles = normalizeRoleList(principal?.clientRoles);
  return new Set([...realmRoles, ...clientRoles]);
}

function toUserRole(value: string): UserRole | null {
  const parsed = userRoleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function getHighestRoleRank(principal: AuthPrincipal | null): number | null {
  const roleSet = getPrincipalRoles(principal);
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

export function canAccess(principal: AuthPrincipal | null, minRank?: number): boolean {
  if (!principal) return false;
  if (typeof minRank !== "number") return true;

  const highestRank = getHighestRoleRank(principal);
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
