/**
 * @file src/main.ts
 * @description Main entry point for the NestJS application.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppDataSource } from './config/typeorm.datasources';

async function bootstrap() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connection established successfully.');
    }
    if (AppDataSource.options.synchronize) {
      await AppDataSource.synchronize();
      console.log('Database synchronized successfully.');
    }
  } catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true,}));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
