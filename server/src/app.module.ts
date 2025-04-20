/**
 * @file src/app.module.ts
 * @description Main application module for the NestJS application.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { typeOrmConfig } from './config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ 
      useFactory: typeOrmConfig}),
    UsersModule,
    AuthModule
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

//EOF
