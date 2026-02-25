// @file: apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { StorageModule } from './modules/storage/storage.module';
import { InstructorApplicationModule } from './modules/instructor-application/instructor-application.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    UserModule,
    AuthModule,
    StorageModule,
    InstructorApplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
