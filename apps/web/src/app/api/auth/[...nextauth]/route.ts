// @file: apps/web/src/app/api/auth/[...nextauth]/route.ts
import type { NextRequest } from "next/server";
import { handlers } from "@/auth";

const { GET: originalGET, POST } = handlers;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * F01 security fix: Strip accessToken from /api/auth/session response.
 * The BFF proxy uses auth() server-side and doesn't need the token exposed to the client.
 */
async function GET(req: NextRequest) {
  const res = await originalGET(req);

  if (new URL(req.url).pathname.endsWith("/session")) {
    const body = await res.json();
    delete body.accessToken;
    return new Response(JSON.stringify(body), {
      headers: res.headers,
      status: res.status,
    });
  }

  return res;
}

export { GET, POST };
