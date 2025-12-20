import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth.constants';
import { AppRole, AuthPrincipal } from '../types';

const roleImplies: Record<AppRole, AppRole[]> = {
  USER: [AppRole.USER],
  COMMITTEE_MEMBER: [AppRole.COMMITTEE_MEMBER, AppRole.USER],
  SECRETARY: [AppRole.SECRETARY, AppRole.COMMITTEE_MEMBER, AppRole.USER],
  CHAIR: [
    AppRole.CHAIR,
    AppRole.SECRETARY,
    AppRole.COMMITTEE_MEMBER,
    AppRole.USER,
  ],
  ADMIN: [
    AppRole.ADMIN,
    AppRole.CHAIR,
    AppRole.SECRETARY,
    AppRole.COMMITTEE_MEMBER,
    AppRole.USER,
  ],
};

function expandRoles(roles: AppRole[]): AppRole[] {
  const out = new Set<AppRole>();
  for (const r of roles) {
    for (const implied of roleImplies[r] ?? [r]) out.add(implied);
  }
  return [...out];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthPrincipal | undefined;
    if (!user) throw new ForbiddenException('Missing principal');

    const effective = expandRoles(user.roles);
    const ok = required.some((r) => effective.includes(r));
    if (!ok) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
