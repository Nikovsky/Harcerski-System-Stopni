// @file: apps/api/src/main.ts
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    helmet({
      // Headers managed by NGINX reverse proxy — disable to avoid duplicates
      strictTransportSecurity: false,
      xContentTypeOptions: false,
      xFrameOptions: false,
      referrerPolicy: false,
      contentSecurityPolicy: false,
      // Helmet-only headers (not set by NGINX) — keep enabled
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      originAgentCluster: true,
      xDnsPrefetchControl: true,
      xDownloadOptions: true,
      xPermittedCrossDomainPolicies: true,
      xXssProtection: true,
    }),
  );
  app.enableShutdownHooks();

  const cfg = app.get(AppConfigService);

  if (cfg.trustProxy) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set("trust proxy", 1);
  }

  app.enableCors({
    origin: cfg.corsOrigins.length ? cfg.corsOrigins : false,
    credentials: true,
  });
  Logger.log(`${cfg.corsOrigins.length ? cfg.corsOrigins.join(", ") : "DISABLED"}`, "CORS");

  await app.listen(cfg.appPort, cfg.appHost);
  Logger.debug(`${cfg.appUrl}`, "API URL");
}
bootstrap();