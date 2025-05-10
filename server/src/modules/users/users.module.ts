/**
 * @file src/modules/users/users.module.ts
 * @description This file defines the UsersModule, which is responsible for managing user accounts and profiles.
 */
import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './user-profile.entity';
import { AuthUserAccount } from '../auth/auth-user-account.entity';
import { UsersProfileService } from './users-profile.service';
import { AuthModule } from '../auth/auth.module';
/**
 * @description NestJS module providing services and controllers related to user accounts and profile management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, AuthUserAccount]), forwardRef(() => AuthModule),],
  controllers: [UsersController],
  providers: [UsersService, UsersProfileService]
})
export class UsersModule {}
