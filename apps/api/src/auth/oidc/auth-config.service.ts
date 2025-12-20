import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthConfigService {
  constructor(private readonly cfg: ConfigService) {}

  get issuer() {
    return this.cfg.getOrThrow<string>('AUTH_ISSUER');
  }
  get jwksUrl() {
    return this.cfg.getOrThrow<string>('AUTH_JWKS_URL');
  }
  get audience() {
    return this.cfg.getOrThrow<string>('AUTH_AUDIENCE');
  }
  get resourceClientId() {
    return this.cfg.get<string>('AUTH_RESOURCE_CLIENT_ID') ?? 'hss-api';
  }
  get clockTolerance() {
    return Number(this.cfg.get('AUTH_CLOCK_TOLERANCE_SECONDS') ?? 5);
  }
  get algorithms() {
    return (this.cfg.get<string>('AUTH_ALLOWED_ALGS') ?? 'RS256')
      .split(',')
      .map((s) => s.trim());
  }
  get allowedAzp() {
    const v = this.cfg.get<string>('AUTH_ALLOWED_AZP');
    return new Set(
      (v ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
}
