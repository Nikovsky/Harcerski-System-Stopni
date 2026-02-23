// @file: apps/web/src/app/api/auth/logout/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { envServer } from "@/config/env.server";

/**
 * Derive the public origin of the web app (works behind reverse proxy).
 */
function getPublicOrigin(req: NextRequest): string {
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (xfProto && xfHost) return `${xfProto}://${xfHost}`;
  return req.nextUrl.origin;
}

/**
 * Serialize a Set-Cookie header string that expires (deletes) the given cookie.
 *
 * NOTE: HttpOnly is fine even when deleting cookies (matches original cookies).
 * We intentionally do NOT set Domain=... (host-only deletion is safest).
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
  "authjs.",
  "__Secure-authjs.",
  "__Host-authjs.",
  "next-auth.",
  "__Secure-next-auth.",
  "__Host-next-auth.",
];

/**
 * Read cookie names from the request and return those matching auth prefixes.
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
 * Read and decode the Auth.js session JWT directly from cookies.
 *
 * Why not `getToken()`?
 * Behind a reverse proxy, secure cookie detection can be unreliable if the
 * original HTTPS protocol is not visible. By reading cookies explicitly, we
 * handle secure/non-secure names AND chunked cookies.
 */
async function readSessionJwt(
  req: NextRequest,
  secret: string,
  isSecure: boolean,
): Promise<Record<string, unknown> | null> {
  const baseNames = isSecure
    ? ["__Host-authjs.session-token", "__Secure-authjs.session-token"]
    : ["authjs.session-token"];

  for (const baseName of baseNames) {
    let raw = req.cookies.get(baseName)?.value;

    // Try chunked cookies (.0, .1, .2, …)
    if (!raw) {
      const chunks: string[] = [];
      for (let i = 0; ; i++) {
        const chunk = req.cookies.get(`${baseName}.${i}`)?.value;
        if (!chunk) break;
        chunks.push(chunk);
      }
      if (chunks.length > 0) raw = chunks.join("");
    }

    if (!raw) continue;

    try {
      const decoded = await decode({ token: raw, secret, salt: baseName });
      if (decoded) return decoded as Record<string, unknown>;
    } catch (e) {
      // Do not leak token contents; just log cookie name + error.
      console.error(`[logout] JWT decode failed for ${baseName}:`, e);
    }
  }

  return null;
}

/**
 * Terminate the Keycloak SSO session server-side.
 *
 * POST to the OIDC logout endpoint with `client_id`, `client_secret`, and
 * `refresh_token`. Keycloak closes the SSO session without browser redirects.
 */
async function revokeKeycloakSession(params: {
  issuer: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  idToken?: string;
}): Promise<void> {
  const logoutUrl = `${params.issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`;

  const body: Record<string, string> = {
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
  };
  if (params.idToken) body.id_token_hint = params.idToken;

  const res = await fetch(logoutUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error(`[logout] Keycloak session revocation failed (${res.status}):`, txt.slice(0, 500));
  } else if (envServer.NODE_ENV !== "production") {
    console.log("[logout] Keycloak SSO session revoked successfully");
  }
}

/**
 * Logout flow — single-click, fully server-side:
 *
 * 1. Read refresh_token from the Auth.js JWT cookie (manual decode)
 * 2. POST to Keycloak logout endpoint with client credentials + refresh_token
 *    → Keycloak terminates the SSO session (no browser redirect needed)
 * 3. Clear all Auth.js session cookies
 * 4. Redirect user to home page
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const publicOrigin = getPublicOrigin(req);

  // Canonical app origin from validated env (safe)
  const canonicalAppOrigin = envServer.HSS_WEB_ORIGIN.replace(/\/$/, "");

  // In weird proxy cases, req-origin may differ; we always redirect to canonical origin.
  const appOrigin = canonicalAppOrigin || publicOrigin.replace(/\/$/, "");
  const isSecure = appOrigin.startsWith("https://");

  // --- Step 1: Decode JWT to extract refresh_token ---
  const jwt = await readSessionJwt(req, envServer.AUTH_SECRET, isSecure);
  const refreshToken = jwt?.refreshToken as string | undefined;
  const idToken = jwt?.idToken as string | undefined;

  // --- Step 2: Revoke Keycloak SSO session (server-side) ---
  if (refreshToken) {
    try {
      await revokeKeycloakSession({
        issuer: envServer.AUTH_KEYCLOAK_ISSUER,
        clientId: envServer.AUTH_KEYCLOAK_ID,
        clientSecret: envServer.AUTH_KEYCLOAK_SECRET,
        refreshToken,
        idToken,
      });
    } catch (e) {
      console.error("[logout] Keycloak revocation error:", e);
    }
  } else {
    console.warn("[logout] No refresh_token — skipping Keycloak revocation");
  }

  // --- Step 3: Clear all Auth.js cookies + redirect home ---
  const cookiesToClear = getAuthCookieNames(req);

  /**
   * Use 200 + HTML redirect (not 302) to guarantee Set-Cookie headers are processed.
   * Some reverse proxies may strip Set-Cookie from 302 responses.
   */
  const redirectTo = `${appOrigin}/`;
  const html = [
    "<!DOCTYPE html>",
    "<html><head>",
    '<meta charset="utf-8">',
    `<meta http-equiv="refresh" content="0;url=${redirectTo}">`,
    "</head><body>",
    `<script>window.location.replace(${JSON.stringify(redirectTo)});</script>`,
    "<noscript>Redirecting&hellip;</noscript>",
    "</body></html>",
  ].join("");

  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  for (const name of cookiesToClear) {
    headers.append("Set-Cookie", expireCookie(name, isSecure));
  }

  return new NextResponse(html, { status: 200, headers });
}

/**
 * POST only — logout via GET enables CSRF attacks (e.g. <img src="/api/auth/logout">).
 */
export async function POST(req: NextRequest) {
  // CSRF guard: allow only same-origin POSTs (Origin preferred, Referer fallback).
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  const allowedOrigin = envServer.HSS_WEB_ORIGIN.replace(/\/$/, "");

  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  if (!requestOrigin || !allowedOrigin || requestOrigin !== allowedOrigin) {
    console.warn("[logout] CSRF check failed:", { origin, referer, allowedOrigin });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return handler(req);
}
