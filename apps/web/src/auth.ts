// @file: apps/web/src/auth.ts
import "server-only";

import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import "next-auth/jwt";
import type { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt";
import { decode as defaultJwtDecode, encode as defaultJwtEncode } from "next-auth/jwt";

import { envServer } from "@/config/env.server";
import {
  acquireSessionRefreshLock,
  decodeOpaqueSessionToken,
  encodeOpaqueSessionToken,
  extractSessionSid,
  readSessionBySid,
  releaseSessionRefreshLock,
  type SessionJwt,
} from "@/server/bff-session.store";

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    realmRoles?: string[];
    clientRoles?: string[];
    error?: "RefreshTokenExpired";
    hssSid?: string;
    hssSessionCreatedAtMs?: number;
    hssSessionAbsoluteExpiresAtMs?: number;
  }
}

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenExpired";
    accessToken?: string;
    realmRoles?: string[];
    clientRoles?: string[];
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const sessionCookieIsSecure = envServer.HSS_WEB_ORIGIN.startsWith("https://");
export const authSessionCookieName = envServer.HSS_SESSION_COOKIE_NAME;
export const forceReauthCookieName = "hss_force_reauth_once";

export async function authJwtEncode(params: JWTEncodeParams): Promise<string> {
  // Only the session token should use our opaque Redis-backed codec.
  // Other Auth.js cookies (pkce/state/nonce) must use default JWT handling.
  if (params.salt !== authSessionCookieName) {
    return defaultJwtEncode(params);
  }
  return encodeOpaqueSessionToken(params);
}

export async function authJwtDecode(params: JWTDecodeParams): Promise<JWT | null> {
  // Keep default handling for non-session Auth.js cookies.
  if (params.salt !== authSessionCookieName) {
    return defaultJwtDecode(params);
  }
  return decodeOpaqueSessionToken(params);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

type JwtPayloadWithRoles = {
  realm_access?: { roles?: unknown };
  resource_access?: Record<string, { roles?: unknown }>;
};

function normalizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const role of value) {
    if (typeof role !== "string") continue;
    const normalized = role.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function decodeJwtPayload(token: string): JwtPayloadWithRoles | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payloadPart = parts[1];
  if (!payloadPart) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as JwtPayloadWithRoles;
  } catch {
    return null;
  }
}

function extractRolesFromAccessToken(
  accessToken: string | undefined,
  clientId: string,
): { realmRoles: string[]; clientRoles: string[] } {
  if (!accessToken) {
    return { realmRoles: [], clientRoles: [] };
  }

  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return { realmRoles: [], clientRoles: [] };
  }

  return {
    realmRoles: normalizeRoles(payload.realm_access?.roles),
    clientRoles: normalizeRoles(payload.resource_access?.[clientId]?.roles),
  };
}

function withDerivedRoles(token: SessionJwt, clientId: string): SessionJwt {
  if (Array.isArray(token.realmRoles) && Array.isArray(token.clientRoles)) {
    return token;
  }

  const roles = extractRolesFromAccessToken(token.accessToken, clientId);
  return {
    ...token,
    realmRoles: roles.realmRoles,
    clientRoles: roles.clientRoles,
  };
}

function expireSessionToken(token: SessionJwt): SessionJwt {
  return {
    ...token,
    accessToken: undefined,
    refreshToken: undefined,
    idToken: undefined,
    accessTokenExpiresAt: undefined,
    realmRoles: [],
    clientRoles: [],
    error: "RefreshTokenExpired",
  };
}

function isTokenFresh(token: SessionJwt): boolean {
  if (!token.accessToken || !token.accessTokenExpiresAt) return false;
  return Date.now() < token.accessTokenExpiresAt - 60_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForPeerRefresh(sid: string): Promise<SessionJwt | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await sleep(120);
    const persisted = await readSessionBySid(sid);
    if (!persisted) return null;

    const token = persisted.token;
    if (token.error === "RefreshTokenExpired") return token;
    if (isTokenFresh(token)) return token;
  }

  return null;
}

async function refreshAccessToken(
  token: SessionJwt,
): Promise<SessionJwt> {
  const issuer = envServer.AUTH_KEYCLOAK_ISSUER;
  const clientId = envServer.AUTH_KEYCLOAK_ID;
  const clientSecret = envServer.AUTH_KEYCLOAK_SECRET;

  if (!token.refreshToken) {
    return expireSessionToken(token);
  }

  try {
    const res = await fetch(
      `${issuer.replace(/\/$/, "")}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: token.refreshToken,
        }),
        signal: AbortSignal.timeout(5_000),
      },
    );

    const text = await res.text();
    let data: Record<string, unknown>;

    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        console.error("[auth] token refresh: invalid JSON payload shape", res.status);
        return expireSessionToken(token);
      }
      data = parsed as Record<string, unknown>;
    } catch {
      console.error("[auth] token refresh: non-JSON response", res.status, text.slice(0, 200));
      return expireSessionToken(token);
    }

    if (!res.ok) {
      const errorCode = asString(data.error);
      const errorDescription = asString(data.error_description);
      const isExpectedAuthRejection =
        errorCode === "invalid_grant" ||
        (typeof errorDescription === "string" &&
          errorDescription.toLowerCase().includes("session doesn't have required client"));

      if (isExpectedAuthRejection) {
        console.warn("[auth] token refresh rejected by provider:", errorDescription ?? errorCode);
      } else {
        console.error("[auth] token refresh failed:", errorDescription ?? errorCode ?? `HTTP ${res.status}`);
      }

      return expireSessionToken(token);
    }

    const accessToken = asString(data.access_token);
    const refreshToken = asString(data.refresh_token);
    const idToken = asString(data.id_token);
    const expiresIn = asNumber(data.expires_in);

    if (!accessToken || !expiresIn) {
      console.error("[auth] token refresh: missing access_token or expires_in");
      return expireSessionToken(token);
    }

    const roles = extractRolesFromAccessToken(accessToken, clientId);

    return {
      ...token,
      accessToken,
      idToken: idToken ?? token.idToken,
      refreshToken: refreshToken ?? token.refreshToken,
      accessTokenExpiresAt: Date.now() + expiresIn * 1000,
      realmRoles: roles.realmRoles,
      clientRoles: roles.clientRoles,
      error: undefined,
    };
  } catch (e) {
    console.error("[auth] token refresh error:", e);
    return expireSessionToken(token);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: envServer.AUTH_SECRET,
  trustHost: envServer.AUTH_TRUST_HOST,
  session: {
    strategy: "jwt",
    maxAge: envServer.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS,
  },
  jwt: {
    maxAge: envServer.HSS_SESSION_ABSOLUTE_TIMEOUT_SECONDS,
    encode: authJwtEncode,
    decode: authJwtDecode,
  },
  cookies: {
    sessionToken: {
      name: authSessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: sessionCookieIsSecure,
      },
    },
  },

  // Behind NGINX reverse proxy, Node.js sees HTTP but cookies were set with
  // __Secure- prefix (browser sees HTTPS). Force useSecureCookies so NextAuth
  // reads the correct cookie names on callback. Without this, PKCE
  // code_verifier cookie is not found → InvalidCheck error.
  useSecureCookies: sessionCookieIsSecure,

  providers: [
    Keycloak({
      issuer: envServer.AUTH_KEYCLOAK_ISSUER,
      clientId: envServer.AUTH_KEYCLOAK_ID,
      clientSecret: envServer.AUTH_KEYCLOAK_SECRET,
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      const sessionToken = token as SessionJwt;
      const keycloakClientId = envServer.AUTH_KEYCLOAK_ID;

      // First login — persist all tokens from Keycloak
      if (account) {
        const accessToken = account.access_token as string | undefined;
        const roles = extractRolesFromAccessToken(accessToken, keycloakClientId);

        return {
          ...sessionToken,
          accessToken,
          idToken: account.id_token as string | undefined,
          refreshToken: account.refresh_token as string | undefined,
          accessTokenExpiresAt:
            typeof account.expires_at === "number" ? account.expires_at * 1000 : undefined,
          realmRoles: roles.realmRoles,
          clientRoles: roles.clientRoles,
          error: undefined,
        };
      }

      // Once refresh is known to be invalid/expired, stop retrying.
      if (sessionToken.error === "RefreshTokenExpired") {
        return expireSessionToken(sessionToken);
      }

      // Token still valid (with 60s safety margin)
      if (isTokenFresh(sessionToken)) {
        return withDerivedRoles(sessionToken, keycloakClientId);
      }

      // Distribute refresh lock through Redis to keep token rotation safe
      // when multiple app instances handle the same session concurrently.
      const sid = extractSessionSid(sessionToken);
      if (!sid) {
        return refreshAccessToken(sessionToken);
      }

      const lockValue = await acquireSessionRefreshLock(sid);
      if (lockValue) {
        try {
          return await refreshAccessToken(sessionToken);
        } finally {
          await releaseSessionRefreshLock(sid, lockValue);
        }
      }

      const refreshedByPeer = await waitForPeerRefresh(sid);
      if (refreshedByPeer) {
        return withDerivedRoles(refreshedByPeer, keycloakClientId);
      }

      return refreshAccessToken(sessionToken);
    },

    async session({ session, token }) {
      if (token.error) session.error = token.error;
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.realmRoles = Array.isArray(token.realmRoles) ? token.realmRoles : [];
      session.clientRoles = Array.isArray(token.clientRoles) ? token.clientRoles : [];

      // Ensure shape exists (avoids TS edge cases)
      session.user = session.user ?? { name: null, email: null, image: null };

      if (token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
