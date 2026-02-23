// @file: apps/api/src/config/app-config.module.ts
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";

import { AppConfigService } from "./app-config.service";
import { envSchema } from "./env.schema";
import { findRepoRoot } from "./repo-root";

function getRepoRootSafe(): string {
  try {
    return findRepoRoot(process.cwd());
  } catch {
    return process.cwd();
  }
}

function buildEnvFilePaths(root: string): string[] {
  // We cannot rely on NODE_ENV from .env before loading files,
  // so we use process.env.NODE_ENV if present, else "development".
  const nodeEnv = (process.env.NODE_ENV ?? "development").trim();

  // precedence: most specific -> least specific
  return [
    resolve(root, `apps/api/.env.${nodeEnv}.local`),
    resolve(root, `apps/api/.env.${nodeEnv}`),
    resolve(root, "apps/api/.env.local"),
    resolve(root, "apps/api/.env"),

    // optional fallbacks (handy with docker compose)
    resolve(root, "docker/.env"),
    resolve(root, ".env"),
  ];
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: buildEnvFilePaths(getRepoRootSafe()),
      validate: (raw: Record<string, unknown>) => {
        const parsed = envSchema.safeParse(raw);
        if (!parsed.success) {
          const details = parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");
          throw new Error(`Invalid environment configuration: ${details}`);
        }
        return parsed.data;
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule { }