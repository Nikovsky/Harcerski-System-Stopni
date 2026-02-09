// @file: apps/web/src/auth.ts
import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import "next-auth/jwt";

// declare module "next-auth" {
//   interface Session {
//     idToken?: string;
//     accessToken?: string;
//   }
// }

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    // refreshToken?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  // debug: process.env.NODE_ENV === "development",
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
      // keep id_token server-side (useful for Keycloak logout hint)
      if (account) {
        token.idToken = account.id_token;
      }
      return token;
    },
  },
})
