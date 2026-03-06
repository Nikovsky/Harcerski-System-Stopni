// @file: apps/api/src/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Shape returned by KeycloakJwtStrategy.validate() */
interface JwtUser {
  sub: string;
  email?: string;
  preferredUsername?: string;
  realmRoles?: unknown;
  clientRoles?: unknown;
}

function normalizeRoleValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    const roles = new Set([
      ...normalizeRoleValues(user.realmRoles),
      ...normalizeRoleValues(user.clientRoles),
    ]);
    if (!required.every((r) => roles.has(r))) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_ROLE',
        message: 'Insufficient role.',
      });
    }

    return true;
  }
}
