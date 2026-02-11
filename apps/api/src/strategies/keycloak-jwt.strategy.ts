// @file: apps/api/src/strategies/keycloak-jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";

export type KeycloakClaims = {
  sub: string;
  email?: string;
  preferred_username?: string;
  iss: string;
  aud: string | string[];
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, "keycloak-jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ["RS256"],
      issuer: process.env.KEYCLOAK_ISSUER,
      audience: process.env.KEYCLOAK_AUDIENCE,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: process.env.KEYCLOAK_JWKS_URL!,
      }),
    });
  }

  async validate(payload: KeycloakClaims) {
    return payload;
  }
}