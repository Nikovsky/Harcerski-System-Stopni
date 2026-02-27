// @file: apps/api/src/guards/jwt-auth.guard.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

type AuthErrorLike = {
  name?: string;
  message?: string;
};

type RequestWithLocals = Request & {
  res?: {
    locals?: {
      requestId?: string;
    };
  };
};

function toErrorLike(value: unknown): AuthErrorLike | null {
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    return {
      name: typeof rec.name === 'string' ? rec.name : undefined,
      message: typeof rec.message === 'string' ? rec.message : undefined,
    };
  }
  return null;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('keycloak-jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    const infoErr = toErrorLike(info);
    const authErr = toErrorLike(err);

    if (err || !user) {
      // info is typically: JsonWebTokenError / TokenExpiredError / error from jwks-rsa
      const isExpired = infoErr?.name === 'TokenExpiredError';
      const req =
        context && typeof context === 'object' && 'switchToHttp' in context
          ? (
              context as {
                switchToHttp?: () => {
                  getRequest?: () => RequestWithLocals;
                };
              }
            )
              .switchToHttp?.()
              .getRequest?.()
          : undefined;

      const headerRequestId = req?.headers?.['x-request-id'];
      const requestId = Array.isArray(headerRequestId)
        ? headerRequestId[0]
        : (headerRequestId ?? req?.res?.locals?.requestId ?? null);

      this.logger.warn('auth failed', {
        err: authErr?.message ?? null,
        info: infoErr?.message ?? null,
        name: infoErr?.name ?? authErr?.name ?? null,
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
