/**
 * @file src/modules/users/users.module.ts
 * @description This file defines the UsersModule, which is responsible for managing user accounts and profiles.
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './user-profile.entity';
import { AuthUserAccount } from '../auth/auth-user-account.entity';
import { AuthService } from '../auth/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, AuthUserAccount])],
  controllers: [UsersController],
  providers: [UsersService, AuthService]
})
export class UsersModule {}
