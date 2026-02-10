// @file: apps/api/src/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { KeycloakClaims } from "../strategies/keycloak-jwt.strategy";

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function extractRoles(user: KeycloakClaims, clientId: string): Set<string> {
  const out = new Set<string>();

  // realm roles
  user.realm_access?.roles?.forEach((r) => out.add(r));

  // client roles
  const clientRoles = user.resource_access?.[clientId]?.roles ?? [];
  clientRoles.forEach((r) => out.add(r));

  return out;
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

    const req = ctx.switchToHttp().getRequest<{ user?: KeycloakClaims }>();
    const user = req.user;
    if (!user) return false;

    // (opcjonalnie, ale polecam) aud check
    const expectedAud = process.env.KEYCLOAK_AUDIENCE!;
    if (expectedAud) {
      const aud = new Set(asArray(user.aud));
      if (!aud.has(expectedAud)) return false;
    }

    const roles = extractRoles(user, expectedAud);
    return required.every((r) => roles.has(r));
  }
}