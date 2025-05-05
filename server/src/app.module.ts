/**
 * @file src/app.module.ts
 * @description Main application module for the NestJS application.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { typeOrmConfig } from './config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { TrialsModule } from './modules/trials/trials.module';
/**
 * @description Root module that initializes configuration, database connection, scheduling, and feature modules.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ 
      useFactory: typeOrmConfig}),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    SessionsModule,
    TrialsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

//EOF
