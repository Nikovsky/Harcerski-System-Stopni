// @file: apps/api/src/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { AuthPrincipal } from '@hss/schemas';

type PassportInfo = {
  message?: string;
  name?: string;
};

type RequestWithRequestId = Request & {
  user?: AuthPrincipal;
  headers: Request['headers'] & {
    'x-request-id'?: string | string[];
  };
  res?: Response & {
    locals?: {
      requestId?: string;
    };
  };
};

function toErrorMessage(value: unknown): string | null {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return null;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('keycloak-jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  override handleRequest<TUser = AuthPrincipal>(
    err: unknown,
    user: TUser | false | null,
    info: PassportInfo | undefined,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    void status;
    if (err || !user) {
      // info is typically: JsonWebTokenError / TokenExpiredError / error from jwks-rsa
      const isExpired = info?.name === 'TokenExpiredError';
      const req = context.switchToHttp().getRequest<RequestWithRequestId>();
      const headerRequestId = req.headers['x-request-id'];
      const requestId = Array.isArray(headerRequestId)
        ? (headerRequestId[0] ?? null)
        : (headerRequestId ?? req.res?.locals?.requestId ?? null);

      const errorName =
        (typeof info?.name === 'string' ? info.name : null) ??
        (err instanceof Error ? err.name : null);
      const errMessage = toErrorMessage(err);
      const infoMessage =
        typeof info?.message === 'string' ? info.message : toErrorMessage(info);

      this.logger.warn(
        `auth failed requestId=${requestId ?? 'n/a'} ` +
          `name=${errorName ?? 'n/a'} ` +
          `err=${errMessage ?? 'n/a'} ` +
          `info=${infoMessage ?? 'n/a'}`,
      );
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
