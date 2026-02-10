// @file: apps/web/src/auth.ts
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    accessTokenExpiresAt?: number; // ms epoch (optional, useful later)
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
      if (account) {
        token.idToken = (account as any).id_token;
        token.accessToken = (account as any).access_token;
        token.accessTokenExpiresAt =
          typeof (account as any).expires_at === "number"
            ? (account as any).expires_at * 1000
            : undefined;
      }
      return token;
    },
  },
});
