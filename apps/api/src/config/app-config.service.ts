// @file: apps/api/src/config/app-config.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "./env.schema";

@Injectable()
export class AppConfigService {
  constructor(private readonly cfg: ConfigService<Env, true>) { }

  get nodeEnv(): Env["NODE_ENV"] {
    return this.cfg.get("NODE_ENV");
  }

  get appPort(): number {
    return this.cfg.get("APP_PORT");
  }

  get appHost(): string {
    return this.cfg.get("APP_HOST");
  }

  get appUrl(): string {
    return this.cfg.get("APP_URL");
  }

  get databaseUrl(): string {
    return this.cfg.get("DATABASE_URL" as any);
  }

  get trustProxy(): boolean {
    return this.cfg.get("TRUST_PROXY");
  }

  get corsOrigins(): string[] {
    const list = this.cfg.get("CORS_ORIGINS");
    if (list?.length) return list;

    const single = this.cfg.get("CORS_ORIGIN");
    return single
      ? single.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
  }
}