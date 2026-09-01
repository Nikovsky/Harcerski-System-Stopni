// @file: apps/api/src/modules/auth/auth.module.ts
import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KeycloakJwtStrategy } from '../../strategies/keycloak-jwt.strategy';
import { BffAuthController } from './bff-auth.controller';
import { BetterAuthService } from './better-auth.service';
import { betterAuthProvider, BETTER_AUTH } from './better-auth.provider';
import { BffSecretService } from './bff-secret.service';
import { AuthRedisService } from './redis.service';
import { SessionPolicyService } from './session-policy.service';

@Global()
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'keycloak-jwt',
      session: false,
    }),
  ],
  controllers: [BffAuthController],
  providers: [
    KeycloakJwtStrategy,
    AuthRedisService,
    SessionPolicyService,
    BffSecretService,
    betterAuthProvider,
    BetterAuthService,
  ],
  exports: [PassportModule, BETTER_AUTH, BetterAuthService, BffSecretService],
})
export class AuthModule {}
