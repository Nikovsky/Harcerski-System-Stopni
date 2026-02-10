// @file: apps/api/src/modules/auth/auth.module.ts
import { Global, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { KeycloakJwtStrategy } from "../../strategies/keycloak-jwt.strategy";

@Global()
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: "keycloak-jwt",
      session: false,
    }),
  ],
  providers: [KeycloakJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule { }