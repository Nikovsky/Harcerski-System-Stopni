// @file: apps/web/src/app/api/auth/login/route.ts
// GET /api/auth/login?callbackUrl=... → redirects to Keycloak login
// Same as SignInButton but accessible via URL redirect from proxy
import { signIn } from "@/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl") ?? "/";
  await signIn("keycloak", { redirectTo: callbackUrl });
}
