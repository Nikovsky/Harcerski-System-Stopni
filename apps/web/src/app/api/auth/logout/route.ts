// @file: apps/web/src/app/api/auth/logout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Derive the public origin of the web app.
 * - If the app is behind a reverse proxy (e.g. Nginx), use X-Forwarded-* headers.
 * - Otherwise fall back to Next.js computed origin.
 *
 * Why: behind Nginx, `req.nextUrl.origin` may become `http://localhost:3000`,
 * while the real browser origin is `https://hss.local`.
 */
function getPublicOrigin(req: NextRequest): string {
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (xfProto && xfHost) return `${xfProto}://${xfHost}`;
  return req.nextUrl.origin;
}

/**
 * Serialize a Set-Cookie header string that expires (deletes) the given cookie.
 */
function expireCookie(name: string, secure: boolean): string {
  const parts = [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Prefixes that identify Auth.js / NextAuth cookies.
 * NextAuth v5 uses chunked cookies for large JWTs — e.g.
 * `__Secure-authjs.session-token.0`, `.1`, `.2`, etc.
 * Matching by prefix catches both base names AND chunks.
 */
const AUTH_COOKIE_PREFIXES = [
  // Auth.js / NextAuth v5
  "authjs.",
  "__Secure-authjs.",
  "__Host-authjs.",
  // NextAuth v4 leftovers
  "next-auth.",
  "__Secure-next-auth.",
  "__Host-next-auth.",
];

/**
 * Read cookie names from the request and return those matching auth prefixes.
 * This dynamically catches chunked cookies (.0, .1, .2, …).
 */
function getAuthCookieNames(req: NextRequest): string[] {
  const names: string[] = [];
  for (const cookie of req.cookies.getAll()) {
    if (AUTH_COOKIE_PREFIXES.some((p) => cookie.name.startsWith(p))) {
      names.push(cookie.name);
    }
  }
  return names;
}

/**
 * Build the Keycloak end-session logout URL.
 */
function buildKeycloakLogoutUrl(params: {
  issuer: string;
  clientId: string;
  postLogoutRedirectUri: string;
  idTokenHint?: string;
}): string {
  const url = new URL(`${params.issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("post_logout_redirect_uri", params.postLogoutRedirectUri);
  if (params.idTokenHint) url.searchParams.set("id_token_hint", params.idTokenHint);
  return url.toString();
}

/**
 * Escape HTML special characters to prevent XSS in the redirect URL.
 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Logout flow (single route, two modes):
 *
 * 1) /api/auth/logout  (START)
 *    - Reads id_token from Auth.js JWT (server-side).
 *    - Returns a 200 HTML page with Set-Cookie headers that clear all auth cookies.
 *    - The HTML page immediately redirects (via meta refresh + JS) to Keycloak
 *      end-session endpoint.
 *    - Why HTML instead of 302: Next.js / NGINX may strip Set-Cookie headers
 *      from redirect responses. A 200 response guarantees cookie processing.
 *
 * 2) /api/auth/logout?mode=finish  (FINISH — defense-in-depth)
 *    - Clears Auth.js cookies again (belt-and-suspenders).
 *    - Redirects to app root.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const publicOrigin = getPublicOrigin(req);
  const appUrl = (process.env.HSS_WEB_ORIGIN ?? process.env.AUTH_URL ?? publicOrigin).replace(/\/$/, "");
  const isSecure = appUrl.startsWith("https://");

  const mode = req.nextUrl.searchParams.get("mode");

  // Collect actual auth cookie names from the request (catches chunks .0, .1, …)
  const cookiesToClear = getAuthCookieNames(req);

  // --- FINISH MODE: defense-in-depth cookie clear + redirect home ---------------
  if (mode === "finish") {
    const headers = new Headers();
    headers.set("Location", `${appUrl}/`);
    headers.set("Cache-Control", "no-store");
    for (const name of cookiesToClear) {
      headers.append("Set-Cookie", expireCookie(name, isSecure));
    }
    return new NextResponse(null, { status: 302, headers });
  }

  // --- START MODE: clear cookies + redirect to Keycloak via HTML ----------------
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const authSecret = process.env.AUTH_SECRET;

  if (!issuer || !clientId || !authSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Read id_token server-side (stored in JWT by NextAuth callbacks)
  const token = await getToken({ req, secret: authSecret });
  const idTokenHint = (token as any)?.idToken as string | undefined;

  const postLogoutUri = `${appUrl}/api/auth/logout?mode=finish`;

  const kcLogoutUrl = buildKeycloakLogoutUrl({
    issuer,
    clientId,
    postLogoutRedirectUri: postLogoutUri,
    idTokenHint,
  });

  // Build a minimal HTML page that the browser renders (200 OK).
  // The 200 response guarantees Set-Cookie headers are processed before redirect.
  const html = [
    "<!DOCTYPE html>",
    "<html><head>",
    `<meta http-equiv="refresh" content="0;url=${escapeHtml(kcLogoutUrl)}">`,
    "</head><body>",
    `<script>window.location.replace(${JSON.stringify(kcLogoutUrl)})</script>`,
    "<noscript>Redirecting to logout&hellip;</noscript>",
    "</body></html>",
  ].join("");

  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  // Set-Cookie headers directly on the Response — bypasses NextResponse.cookies
  // which may be stripped by Next.js on certain response types.
  for (const name of cookiesToClear) {
    headers.append("Set-Cookie", expireCookie(name, isSecure));
  }

  return new NextResponse(html, { status: 200, headers });
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}
