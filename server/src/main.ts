/**
 * @file src/main.ts
 * @description Main entry point for the NestJS application.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppDataSource } from './config/typeorm.datasources';
import * as cookieParser from 'cookie-parser';

async function initializeWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await AppDataSource.initialize();
      console.log('📦 Data Source initialized');
      return;
    } catch (err) {
      console.warn(`🔁 Retry ${i + 1}/${retries}...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('❌ Failed to connect to DB after retries');
}

async function bootstrap() {
  await initializeWithRetry();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true,}));
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
