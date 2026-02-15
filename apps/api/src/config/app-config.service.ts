// @file: apps/api/src/config/app-config.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "./env.schema";

@Injectable()
export class AppConfigService {
  constructor(private readonly cfg: ConfigService<Env, true>) { }

  // === APP ===
  get nodeEnv(): Env["NODE_ENV"] {
    return this.cfg.get("NODE_ENV", { infer: true });
  }

  get appName(): string {
    return this.cfg.get("APP_NAME", { infer: true });
  }

  get appHost(): string {
    return this.cfg.get("APP_HOST", { infer: true });
  }

  get appPort(): number {
    return this.cfg.get("APP_PORT", { infer: true });
  }

  get appUrl(): string {
    return this.cfg.get("APP_URL", { infer: true });
  }

  get databaseUrl(): string {
    return this.cfg.get("DATABASE_URL", { infer: true });
  }

  get trustProxy(): boolean {
    return this.cfg.get("TRUST_PROXY", { infer: true });
  }

  get corsOrigins(): string[] {
    const list = this.cfg.get("CORS_ORIGINS", { infer: true });
    return list

    // legacy fallback
    // const single = this.cfg.get("CORS_ORIGIN", { infer: true });
    // return single
    //   ? single
    //     .split(",")
    //     .map((s) => s.trim())
    //     .filter(Boolean)
    //   : [];
  }

  // === KEYCLOAK ===
  get keycloakRealm(): string {
    return this.cfg.get("KEYCLOAK_REALM", { infer: true });
  }

  get keycloakIssuer(): string {
    // normalize trailing slash
    return this.cfg.get("KEYCLOAK_ISSUER", { infer: true }).replace(/\/$/, "");
  }

  get keycloakJwksUrl(): string {
    return this.cfg.get("KEYCLOAK_JWKS_URL", { infer: true });
  }

  get keycloakAudience(): string {
    return this.cfg.get("KEYCLOAK_AUDIENCE", { infer: true });
  }

  get keycloakTokenUrl(): string {
    const explicit = this.cfg.get("KEYCLOAK_TOKEN_URL", { infer: true });
    if (explicit) return explicit;
    return `${this.keycloakIssuer}/protocol/openid-connect/token`;
  }

  // M2M optional
  get keycloakApiClientId(): string | undefined {
    return this.cfg.get("KEYCLOAK_API_CLIENT_ID", { infer: true }) || undefined;
  }

  get keycloakApiClientSecret(): string | undefined {
    return this.cfg.get("KEYCLOAK_API_CLIENT_SECRET", { infer: true }) || undefined;
  }
}