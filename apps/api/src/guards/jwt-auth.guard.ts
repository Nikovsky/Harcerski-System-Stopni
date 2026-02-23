// @file: apps/api/src/guards/jwt-auth.guard.ts
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("keycloak-jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // info is typically: JsonWebTokenError / TokenExpiredError / error from jwks-rsa
      this.logger.warn("auth failed", {
        err: err?.message ?? err ?? null,
        info: info?.message ?? info ?? null,
        name: info?.name ?? err?.name ?? null,
      });
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
