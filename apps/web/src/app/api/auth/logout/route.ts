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
 * Build a safe "returnTo" URL.
 * - Accepts absolute or relative values (we read it from query string).
 * - Enforces same-origin with the app base URL to prevent open redirects.
 */
function safeReturnTo(raw: string | null, appUrl: string): string {
  const fallback = `${appUrl}/`;
  if (!raw) return fallback;

  try {
    const target = new URL(raw, appUrl);
    const appOrigin = new URL(appUrl).origin;
    return target.origin === appOrigin ? target.toString() : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Clear Auth.js / NextAuth cookies.
 * Note: cookie names can differ between versions and deployments,
 * so we clear a known superset (safe no-op if a cookie doesn't exist).
 */
function clearAuthCookies(res: NextResponse, opts: { secure: boolean }): void {
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: opts.secure,
    maxAge: 0,
  };

  const names = [
    // Auth.js / NextAuth v5
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Host-authjs.session-token",

    "__Host-authjs.csrf-token",
    "__Secure-authjs.csrf-token",
    "authjs.csrf-token",

    "__Secure-authjs.callback-url",
    "authjs.callback-url",
    "__Host-authjs.callback-url",

    "__Secure-authjs.pkce.code_verifier",
    "authjs.pkce.code_verifier",

    "__Secure-authjs.state",
    "authjs.state",

    "__Secure-authjs.nonce",
    "authjs.nonce",

    // NextAuth v4 leftovers (safe to clear)
    "__Secure-next-auth.session-token",
    "next-auth.session-token",

    "__Host-next-auth.csrf-token",
    "next-auth.csrf-token",

    "__Secure-next-auth.callback-url",
    "next-auth.callback-url",
  ];

  for (const name of names) {
    res.cookies.set(name, "", common);
  }
}

/**
 * Build the Keycloak end-session logout URL.
 *
 * We use front-channel logout to ensure the Keycloak SSO session is actually ended.
 * The `id_token_hint` parameter can suppress the Keycloak "Do you want to log out?" page
 * (depends on Keycloak settings / client configuration).
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
 * Logout flow (single route, two modes):
 *
 * 1) /api/auth/logout
 *    - Builds a safe returnTo URL (same-origin).
 *    - Reads id_token from Auth.js JWT (server-side).
 *    - Redirects the browser to Keycloak end-session endpoint with:
 *        - client_id
 *        - id_token_hint (optional)
 *        - post_logout_redirect_uri => /api/auth/logout?mode=finish&returnTo=...
 *
 * 2) /api/auth/logout?mode=finish&returnTo=...
 *    - Clears Auth.js cookies (hard local logout).
 *    - Redirects back to `returnTo`.
 *
 * Why this design:
 * - Ensures Keycloak SSO session ends (not only local cookies).
 * - Still guarantees local hard logout (cookie cleanup) even if Keycloak UI/redirect changes.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const publicOrigin = getPublicOrigin(req);
  const appUrl = (process.env.HSS_WEB_ORIGIN ?? process.env.AUTH_URL ?? publicOrigin).replace(/\/$/, "");
  const isSecure = appUrl.startsWith("https://");

  const mode = req.nextUrl.searchParams.get("mode");

  // --- FINISH MODE: clear local cookies and return to the app -------------------
  if (mode === "finish") {
    const returnToRaw = req.nextUrl.searchParams.get("returnTo");
    const returnTo = safeReturnTo(returnToRaw, appUrl);

    const res = NextResponse.redirect(returnTo, { status: 302 });
    res.headers.set("Cache-Control", "no-store");
    clearAuthCookies(res, { secure: isSecure });
    return res;
  }

  // --- START MODE: redirect to Keycloak end-session ----------------------------
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const authSecret = process.env.AUTH_SECRET;

  if (!issuer || !clientId || !authSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Prefer explicit returnTo from POST form; fallback to Referer.
  let returnToRaw: string | null = req.headers.get("referer");

  if (req.method === "POST") {
    try {
      const form = await req.formData();
      const rt = form.get("returnTo");
      if (typeof rt === "string" && rt.trim()) returnToRaw = rt;
    } catch {
      // ignore malformed form-data
    }
  }

  const returnTo = safeReturnTo(returnToRaw, appUrl);

  // Read id_token server-side (stored in JWT in your NextAuth callbacks)
  const token = await getToken({ req, secret: authSecret });
  const idTokenHint = (token as any)?.idToken as string | undefined;

  // Build our own finish URL
  const finish = new URL(`${appUrl}/api/auth/logout`);
  finish.searchParams.set("mode", "finish");
  finish.searchParams.set("returnTo", returnTo);

  const kcLogoutUrl = buildKeycloakLogoutUrl({
    issuer,
    clientId,
    postLogoutRedirectUri: finish.toString(),
    idTokenHint,
  });

  return NextResponse.redirect(kcLogoutUrl, { status: 302 });
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}