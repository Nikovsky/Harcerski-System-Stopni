import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OidcJwtService } from './oidc/oidc-jwt.service';
import { AuthzController } from './authz.controller';
import { AuthConfigService } from './oidc/auth-config.service';
import { AuditService } from 'src/audit/audi.service';

@Module({
  controllers: [AuthController, AuthzController],
  providers: [AuthConfigService, AuthService, OidcJwtService, AuditService],
  exports: [AuthConfigService, AuthService, OidcJwtService],
})
export class AuthModule {}
