import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth.constants';
import { OidcJwtService } from './oidc-jwt.service';
import { AppRole, AuthPrincipal } from '../types';
import { AuthConfigService } from './auth-config.service';

function mapRoles(rawRoles: string[]): AppRole[] {
  const allowed = new Set(Object.values(AppRole));
  return rawRoles.filter((r) => allowed.has(r as AppRole)) as AppRole[];
}

@Injectable()
export class OidcAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: OidcJwtService,
    private readonly authCfg: AuthConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers['authorization'];

    if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = auth.slice('Bearer '.length).trim();
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let payload: any;
    try {
      payload = await this.jwt.verifyAccessToken(token, {
        issuer: this.authCfg.issuer,
        audience: this.authCfg.audience,
        algorithms: this.authCfg.algorithms as any,
        clockTolerance: this.authCfg.clockTolerance,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    const sub = payload.sub;
    if (!sub || typeof sub !== 'string') {
      throw new UnauthorizedException('Token missing sub');
    }

    const azp = typeof payload.azp === 'string' ? payload.azp : undefined;
    const allowedAzp = this.authCfg.allowedAzp;

    // Jeśli allowedAzp ustawione, to wymagaj azp i musi być na liście
    if (allowedAzp.size > 0 && (!azp || !allowedAzp.has(azp))) {
      throw new UnauthorizedException('Unauthorized client (azp)');
    }

    const resourceClientId = this.authCfg.resourceClientId;

    const rawRoles: string[] = [];

    const realmAccess = payload.realm_access?.roles;
    if (Array.isArray(realmAccess)) {
      rawRoles.push(...realmAccess.filter((x: any) => typeof x === 'string'));
    }

    const resourceAccess = payload.resource_access?.[resourceClientId]?.roles;
    if (Array.isArray(resourceAccess)) {
      rawRoles.push(
        ...resourceAccess.filter((x: any) => typeof x === 'string'),
      );
    }

    const dedupRawRoles = [...new Set(rawRoles)];
    const roles = mapRoles(dedupRawRoles);

    const principal: AuthPrincipal = {
      sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      displayName:
        (typeof payload.name === 'string' ? payload.name : undefined) ??
        (typeof payload.preferred_username === 'string'
          ? payload.preferred_username
          : undefined),
      azp,
      roles,
      rawRoles: dedupRawRoles,
    };

    req.user = principal;
    return true;
  }
}
