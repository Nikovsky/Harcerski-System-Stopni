// @file: apps/api/src/config/app-config.module.ts
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppConfigService } from "./app-config.service";
import { envSchema } from "./env.schema";
import { findRepoRoot } from "./repo-root";
import { resolve } from "node:path";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: (() => {
        const root = findRepoRoot(process.cwd());
        return [resolve(root, "apps/api/.env")];
      })(),
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