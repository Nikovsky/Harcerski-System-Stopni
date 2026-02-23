// @file: apps/web/src/proxy.ts
import createMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default auth((req) => intlMiddleware(req));

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
