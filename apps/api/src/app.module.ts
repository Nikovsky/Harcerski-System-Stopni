// @file: apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { StorageModule as FeatureStorageModule } from './modules/storage/storage.module';
import { InstructorApplicationModule } from './modules/instructor-application/instructor-application.module';
import { ProfileModule } from './modules/user/profile/profile.module';
import { RolesGuard } from './guards/roles.guard';
import { StorageModule as BootstrapStorageModule } from './storage/storage.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    FeatureStorageModule,
    BootstrapStorageModule,
    ProfileModule,
    InstructorApplicationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
