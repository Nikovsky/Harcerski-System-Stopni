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
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionsModule } from '../sessions/sessions.module';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

/**
 * @description NestJS module responsible for authentication logic, JWT configuration, and session management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuthUserAccount]),
  JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => ({
      secret: config.get<string>('JWT_SECRET'),
      signOptions: {
        expiresIn: config.get<string>('JWT_SECRET_EXPIRES_IN') || '15m',
      }
    }),
  }),
  SessionsModule,
],
  providers: [AuthService, UsersService, JwtStrategy, JwtAuthGuard, RefreshTokenGuard],
  controllers: [AuthController],
  exports: [JwtAuthGuard]
})
export class AuthModule {}
