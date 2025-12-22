import NextAuth, { type NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";
import type { Account, Session } from "next-auth";

async function refreshAccessToken(token: JWT & { refreshToken?: string }) {
  try {
    const issuer = process.env.KEYCLOAK_ISSUER!;
    const clientId = process.env.KEYCLOAK_CLIENT_ID!;
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET!;

    const refreshToken = (token as any).refreshToken as string | undefined;
    if (!refreshToken) throw new Error("Missing refresh token");

    const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);

    const refreshed = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

function decodeJwtPayload(accessToken: string): any {
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1]!;
  const json = Buffer.from(payload, "base64url").toString("utf8");
  return JSON.parse(json);
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  callbacks: {
    async jwt({
      token,
      account,
    }: {
      token: JWT & any;
      account?: Account | null;
    }) {
      // Pierwsze logowanie
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 60_000;

        // Role tylko do UI (bez tokenów w session)
        const payload = decodeJwtPayload(account.access_token);
        const rawRoles: string[] = [
          ...(payload?.realm_access?.roles ?? []),
          ...(payload?.resource_access?.["hss-api"]?.roles ?? []),
        ].filter((x: any) => typeof x === "string");

        token.roles = Array.from(new Set(rawRoles));
        return token;
      }

      // Nadal ważny
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 10_000
      ) {
        return token;
      }

      // Odśwież
      return refreshAccessToken(token);
    },

    async session({
      session,
      token,
    }: {
      session: Session & any;
      token: JWT & any;
    }) {
      session.roles = token.roles ?? [];
      session.error = token.error;
      return session;
    },
  },
};

export default NextAuth(authOptions);
