// @file: apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { StorageModule } from './modules/storage/storage.module';
import { InstructorApplicationModule } from './modules/instructor-application/instructor-application.module';
import { ProfileModule } from './modules/user/profile/profile.module';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [

    AppConfigModule,
    ScheduleModule.forRoot(),

    PrismaModule,

    AuthModule,

    StorageModule,
    ProfileModule,
    InstructorApplicationModule,
    ,
    StorageModule,
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
export class AppModule { }
