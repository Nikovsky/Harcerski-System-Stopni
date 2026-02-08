// @file: apps/web/src/app/api/auth/logout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function buildKeycloakLogoutUrl(params: {
  issuer: string;
  clientId: string;
  postLogoutRedirectUri: string;
  idTokenHint?: string;
}) {
  const url = new URL(`${params.issuer}/protocol/openid-connect/logout`);
  url.searchParams.set("client_id", params.clientId);

  if (params.idTokenHint) {
    url.searchParams.set("id_token_hint", params.idTokenHint);
  }

  url.searchParams.set("post_logout_redirect_uri", params.postLogoutRedirectUri);
  return url;
}

async function handler(req: NextRequest) {
  const appUrl = process.env.AUTH_URL!; // https://hss.local
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER!; // https://auth.hss.local/realms/hss
  const clientId = process.env.AUTH_KEYCLOAK_ID!;
  const secret = process.env.AUTH_SECRET!;

  // id_token_hint (server-side)
  const token = await getToken({ req, secret });
  const idTokenHint = (token as any)?.idToken as string | undefined;

  // po KC logout wracamy na Auth.js signout (czyści cookies aplikacji)
  const signout = new URL(`${appUrl}/api/auth/signout`);
  signout.searchParams.set("callbackUrl", `${appUrl}/`);

  const kcLogout = buildKeycloakLogoutUrl({
    issuer,
    clientId,
    postLogoutRedirectUri: signout.toString(),
    idTokenHint,
  });

  return NextResponse.redirect(kcLogout.toString(), { status: 302 });
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}


// SOFT LOGOUT - tylko czyści cookies Auth.js, ale nie przekierowuje do Keycloak logout (SSO)


// import type { NextRequest } from "next/server";
// import { getToken } from "next-auth/jwt";
// import { signOut } from "@/auth";

// function buildKeycloakLogoutUrl(params: {
//   issuer: string;
//   clientId: string;
//   postLogoutRedirectUri: string;
//   idTokenHint?: string;
// }) {
//   const url = new URL(`${params.issuer}/protocol/openid-connect/logout`);
//   url.searchParams.set("client_id", params.clientId);

//   if (params.idTokenHint) {
//     url.searchParams.set("id_token_hint", params.idTokenHint);
//   }

//   // musi być na liście post-logout redirect uris w Keycloak (u Ciebie jest https://hss.local/*)
//   url.searchParams.set("post_logout_redirect_uri", params.postLogoutRedirectUri);

//   return url.toString();
// }

// async function handle(req: NextRequest) {
//   const token = await getToken({ req, secret: process.env.AUTH_SECRET });
//   const idTokenHint = (token as any)?.idToken as string | undefined;

//   const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
//   const clientId = process.env.AUTH_KEYCLOAK_ID!;
//   const appUrl = process.env.AUTH_URL!; // https://hss.local

//   const keycloakLogoutUrl = buildKeycloakLogoutUrl({
//     issuer,
//     clientId,
//     postLogoutRedirectUri: `${appUrl}/`,
//     idTokenHint,
//   });

//   // 1) czyści cookies Auth.js
//   // 2) przekierowuje do Keycloak logout (SSO)
//   return signOut({ redirectTo: keycloakLogoutUrl });
// }

// export async function GET(req: NextRequest) {
//   return handle(req);
// }

// export async function POST(req: NextRequest) {
//   return handle(req);
// }