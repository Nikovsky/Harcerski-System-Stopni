// @file: apps/api/src/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
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
    if (!user) {
      throw new UnauthorizedException({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
      });
    }

    const roles = new Set([...user.realmRoles, ...user.clientRoles]);
    if (!required.every((r) => roles.has(r))) {
      throw new ForbiddenException({
        code: "INSUFFICIENT_ROLE",
        message: "Insufficient role.",
      });
    }

    return true;
  }
}
