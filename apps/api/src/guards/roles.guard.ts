// @file: apps/api/src/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

/** Shape returned by KeycloakJwtStrategy.validate() */
interface JwtUser {
  sub: string;
  email?: string;
  preferredUsername?: string;
  realmRoles: string[];
  clientRoles: string[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = req.user;
    if (!user) return false;

    const roles = new Set([...user.realmRoles, ...user.clientRoles]);
    return required.every((r) => roles.has(r));
  }
}