// @file: apps/api/src/guards/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("keycloak-jwt") {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // info is typically: JsonWebTokenError / TokenExpiredError / error from jwks-rsa
      console.error("[API][JWT] auth failed:", {
        err: err?.message ?? err ?? null,
        info: info?.message ?? info ?? null,
        name: info?.name ?? err?.name ?? null,
      });
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
