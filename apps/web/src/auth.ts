// @file: apps/web/src/auth.ts
import "server-only";

import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

import { envServer } from "@/config/env.server";

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    error?: "RefreshTokenExpired";
  }
}

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenExpired";
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Mutex map: one refresh per authenticated session key (per Node.js process).
const refreshPromises = new Map<string, Promise<JWT>>();

function getRefreshMutexKey(token: JWT): string {
  if (token.sub) return `${token.sub}:${token.refreshToken?.slice(-12) ?? "no-refresh-token"}`;
  return token.refreshToken?.slice(-12) ?? "anonymous";
}

async function refreshAccessToken(
  token: JWT,
): Promise<JWT> {
  const issuer = envServer.AUTH_KEYCLOAK_ISSUER;
  const clientId = envServer.AUTH_KEYCLOAK_ID;
  const clientSecret = envServer.AUTH_KEYCLOAK_SECRET;

  if (!token.refreshToken) {
    return { ...token, accessToken: undefined, error: "RefreshTokenExpired" };
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
    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("[auth] token refresh: non-JSON response", res.status, text.slice(0, 200));
      return { ...token, accessToken: undefined, error: "RefreshTokenExpired" };
    }

    if (!res.ok) {
      console.error("[auth] token refresh failed:", data.error_description ?? data.error);
      return { ...token, accessToken: undefined, error: "RefreshTokenExpired" };
    }

    return {
      ...token,
      accessToken: data.access_token,
      idToken: data.id_token ?? token.idToken,
      refreshToken: data.refresh_token ?? token.refreshToken,
      accessTokenExpiresAt:
        typeof data.expires_in === "number"
          ? Date.now() + data.expires_in * 1000
          : Date.now() + 300_000,
      error: undefined,
    };
  } catch (e) {
    console.error("[auth] token refresh error:", e);
    return { ...token, accessToken: undefined, error: "RefreshTokenExpired" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: envServer.AUTH_SECRET,
  trustHost: envServer.AUTH_TRUST_HOST,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8h — F07 fix

  // Behind NGINX reverse proxy, Node.js sees HTTP but cookies were set with
  // __Secure- prefix (browser sees HTTPS). Force useSecureCookies so NextAuth
  // reads the correct cookie names on callback. Without this, PKCE
  // code_verifier cookie is not found → InvalidCheck error.
  useSecureCookies: true,

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
      // First login — persist all tokens from Keycloak
      if (account) {
        return {
          ...token,
          accessToken: account.access_token as string | undefined,
          idToken: account.id_token as string | undefined,
          refreshToken: account.refresh_token as string | undefined,
          accessTokenExpiresAt:
            typeof account.expires_at === "number" ? account.expires_at * 1000 : undefined,
          error: undefined,
        };
      }

      // Token still valid (with 60s safety margin)
      if (token.accessTokenExpiresAt && Date.now() < token.accessTokenExpiresAt - 60_000) {
        return token;
      }

      // Refresh silently (mutex prevents concurrent refresh per session key)
      const refreshKey = getRefreshMutexKey(token);
      const runningRefresh = refreshPromises.get(refreshKey);
      if (runningRefresh) {
        return runningRefresh;
      }

      const nextRefresh = refreshAccessToken(token).finally(() => {
        refreshPromises.delete(refreshKey);
      });
      refreshPromises.set(refreshKey, nextRefresh);
      return nextRefresh;
    },

    async session({ session, token }) {
      if (token.error) session.error = token.error;

      // Ensure shape exists (avoids TS edge cases)
      session.user = session.user ?? { name: null, email: null, image: null };

      if (token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
