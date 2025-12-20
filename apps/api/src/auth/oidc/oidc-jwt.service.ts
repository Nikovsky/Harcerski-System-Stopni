import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTVerifyOptions } from 'jose';
import { AuthConfigService } from './auth-config.service';

@Injectable()
export class OidcJwtService implements OnModuleInit {
  private jwks!: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly authCfg: AuthConfigService) {}

  onModuleInit() {
    this.jwks = createRemoteJWKSet(new URL(this.authCfg.jwksUrl));
  }

  async verifyAccessToken(token: string, opts: JWTVerifyOptions) {
    const res = await jwtVerify(token, this.jwks, opts);
    return res.payload;
  }
}
