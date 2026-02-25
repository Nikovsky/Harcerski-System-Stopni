// @file: apps/web/src/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication (without locale prefix)
const PROTECTED_PATTERNS = ["/applications", "/dashboard"];

function isProtectedRoute(pathname: string): boolean {
  // Strip locale prefix (e.g. /pl/applications → /applications)
  const withoutLocale = pathname.replace(/^\/(pl|en)/, "");
  return PROTECTED_PATTERNS.some((p) => withoutLocale.startsWith(p));
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check auth for protected routes
  if (isProtectedRoute(pathname)) {
    // NextAuth v5 stores session in cookies — check for session token
    const hasSession = request.cookies.getAll().some(
      (c) =>
        c.name.includes("authjs.session-token") ||
        c.name.includes("next-auth.session-token"),
    );

    if (!hasSession) {
      // Redirect to login endpoint which calls signIn("keycloak") — same as navbar Login button
      const loginUrl = new URL("/api/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Run next-intl middleware for all matched routes
  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
