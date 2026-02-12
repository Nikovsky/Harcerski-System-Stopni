// @file: apps/web/src/auth.ts
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import "next-auth/jwt";

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
  }
}

// Mutex: only one refresh at a time per Node.js process.
// Prevents race condition when multiple concurrent requests try to refresh
// the same token — Keycloak's refresh token rotation would invalidate the old
// token, causing random logouts.
let refreshPromise: Promise<import("next-auth/jwt").JWT> | null = null;

async function refreshAccessToken(token: import("next-auth/jwt").JWT): Promise<import("next-auth/jwt").JWT> {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;

  if (!issuer || !clientId || !clientSecret || !token.refreshToken) {
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
          : Date.now() + 300_000, // fallback: 5 min
      error: undefined,
    };
  } catch (e) {
    console.error("[auth] token refresh error:", e);
    return { ...token, accessToken: undefined, error: "RefreshTokenExpired" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Keycloak({
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
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
            typeof account.expires_at === "number"
              ? account.expires_at * 1000
              : undefined,
          error: undefined,
        };
      }

      // Token still valid (with 60s safety margin) — return as-is
      if (
        token.accessTokenExpiresAt &&
        Date.now() < token.accessTokenExpiresAt - 60_000
      ) {
        return token;
      }

      // Token expired or about to expire — refresh silently (mutex prevents concurrent refreshes)
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken(token).finally(() => {
          refreshPromise = null;
        });
      }
      return refreshPromise;
    },

    async session({ session, token }) {
      if (token.error) {
        session.error = token.error;
      }
      if (token.sub) {
        session.user.id = token.sub;
      }
      // accessToken is NOT exposed to the client (XSS mitigation).
      // Server-side routes (BFF) read it directly from cookies via manual JWT decode.
      return session;
    },
  },
});
