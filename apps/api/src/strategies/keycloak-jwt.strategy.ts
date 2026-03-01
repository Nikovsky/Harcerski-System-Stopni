// @file: apps/api/src/strategies/keycloak-jwt.strategy.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AppConfigService } from '@/config/app-config.service';
import { AuthPrincipalSchema, type AuthPrincipal } from '@hss/schemas';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AppConfigService } from '@/config/app-config.service';
import { AuthPrincipalSchema, type AuthPrincipal } from '@hss/schemas';

export type KeycloakClaims = {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  iss: string;
  aud: string | string[];
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(
  Strategy,
  'keycloak-jwt',
) {
export class KeycloakJwtStrategy extends PassportStrategy(
  Strategy,
  'keycloak-jwt',
) {
  private readonly logger = new Logger(KeycloakJwtStrategy.name);

  constructor(private readonly appConfig: AppConfigService) {
    const issuer = appConfig.keycloakIssuer.replace(/\/$/, '');
    const issuer = appConfig.keycloakIssuer.replace(/\/$/, '');
    const audience = appConfig.keycloakAudience;
    const jwksUri = appConfig.keycloakJwksUrl;

    if (!issuer || !audience || !jwksUri) {
      throw new Error(
        '[KeycloakJwtStrategy] Missing required env vars: ' +
        [
          !issuer && 'KEYCLOAK_ISSUER',
          !audience && 'KEYCLOAK_AUDIENCE',
          !jwksUri && 'KEYCLOAK_JWKS_URL',
        ]
          .filter(Boolean)
          .join(', '),
        '[KeycloakJwtStrategy] Missing required env vars: ' +
        [
          !issuer && 'KEYCLOAK_ISSUER',
          !audience && 'KEYCLOAK_AUDIENCE',
          !jwksUri && 'KEYCLOAK_JWKS_URL',
        ]
          .filter(Boolean)
          .join(', '),
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      algorithms: ['RS256'],
      issuer,
      audience,
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });
  }

  validate(payload: KeycloakClaims): AuthPrincipal {
    validate(payload: KeycloakClaims): AuthPrincipal {
      const audience = this.appConfig.keycloakAudience;

      // Build principal in the exact shape defined by packages/schemas
      const principalCandidate = {
        sub: payload.sub,
        email: payload.email ?? null,
        preferredUsername: payload.preferred_username ?? null,
        name: payload.name ?? null,
        realmRoles: payload.realm_access?.roles ?? [],
        clientRoles: payload.resource_access?.[audience]?.roles ?? [],
      };

      // Runtime validation (single source of truth)
      const parsed = AuthPrincipalSchema.safeParse(principalCandidate);
      if (!parsed.success) {
        // keep logs safe; don't dump full token
        this.logger.warn('AuthPrincipal validation failed', {
          issues: parsed.error.issues?.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        });
        throw new UnauthorizedException('Invalid access token claims');
        throw new UnauthorizedException('Invalid access token claims');
      }

      return parsed.data;
    }
  }

