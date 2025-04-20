/**
 * @file src/modules/auth/auth.module.ts
 * @description Auth module setup.
 */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUserAccount } from './auth-user-account.entity';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthUserAccount])],
  providers: [AuthService, UsersService],
  controllers: [AuthController]
})
export class AuthModule {}
