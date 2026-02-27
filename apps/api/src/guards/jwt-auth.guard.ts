// @file: apps/api/src/guards/jwt-auth.guard.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('keycloak-jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      // info is typically: JsonWebTokenError / TokenExpiredError / error from jwks-rsa
      const isExpired = info?.name === 'TokenExpiredError';
      const req = context?.switchToHttp?.().getRequest?.();
      const headerRequestId = req?.headers?.['x-request-id'];
      const requestId = Array.isArray(headerRequestId)
        ? headerRequestId[0]
        : (headerRequestId ?? req?.res?.locals?.requestId ?? null);

      this.logger.warn('auth failed', {
        err: err?.message ?? err ?? null,
        info: info?.message ?? info ?? null,
        name: info?.name ?? err?.name ?? null,
        requestId,
      });
      throw new UnauthorizedException({
        code: isExpired ? 'ACCESS_TOKEN_EXPIRED' : 'AUTHENTICATION_REQUIRED',
        message: isExpired
          ? 'Access token expired.'
          : 'Authentication required.',
      });
    }
    return user;
  }
}
