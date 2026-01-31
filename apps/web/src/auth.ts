// @file: apps/web/src/auth.ts
import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    idToken?: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id_token?: string;
    access_token?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
    }),
  ],
  // callbacks: {
  //   async jwt({ token, account }) {
  //     if (account) {
  //       // available on initial sign-in
  //       token.id_token = account.id_token;
  //       token.access_token = account.access_token;
  //     }
  //     return token;
  //   },
  //   async session({ session, token }) {
  //     session.idToken = token.id_token as string | undefined;
  //     session.accessToken = token.access_token as string | undefined;
  //     return session;
  //   },
  // },
})
