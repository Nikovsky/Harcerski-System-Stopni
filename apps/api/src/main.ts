// @file: apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

function normalizeRequestId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(trimmed)) return undefined;
  return trimmed;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId =
      normalizeRequestId(req.get('x-request-id')) ?? randomUUID();
    req.headers['x-request-id'] = requestId;
    const requestId =
      normalizeRequestId(req.get('x-request-id')) ?? randomUUID();
    req.headers['x-request-id'] = requestId;
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Request-Id', requestId);
    next();
  });
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
  const storage = app.get(StorageService);

  if (cfg.trustProxy) {
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.set('trust proxy', 1);
  }

  app.enableCors({
    origin: cfg.corsOrigins.length ? cfg.corsOrigins : false,
    credentials: true,
  });
  Logger.log(
    `${cfg.corsOrigins.length ? cfg.corsOrigins.join(', ') : 'DISABLED'}`,
    'CORS',
  );
  Logger.log(
    `${cfg.corsOrigins.length ? cfg.corsOrigins.join(', ') : 'DISABLED'}`,
    'CORS',
  );

  await storage.ensureBucketReady();
  await app.listen(cfg.appPort, cfg.appHost);
  Logger.debug(`${cfg.appUrl}`, 'API URL');
  Logger.debug(
    cfg.corsOrigins.length ? cfg.corsOrigins.join(', ') : 'DISABLED',
    'WEB URL',
  );
}

void bootstrap().catch((error: unknown) => {
  const details =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  Logger.error(details, undefined, 'Bootstrap');
  process.exit(1);
});
