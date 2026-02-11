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
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("[auth] token refresh failed:", data.error_description ?? data.error);
      return { ...token, accessToken: undefined, error: "RefreshTokenExpired" };
    }

    return {
      ...token,
      accessToken: data.access_token,
      idToken: data.id_token ?? token.idToken,
      refreshToken: data.refresh_token ?? token.refreshToken,
      accessTokenExpiresAt: Date.now() + data.expires_in * 1000,
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

      // Token expired or about to expire — refresh silently
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (token.error) {
        session.error = token.error;
      }
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
