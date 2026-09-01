// @file: apps/api/src/modules/auth/bff-secret.service.ts
import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { AppConfigService } from '@/config/app-config.service';

@Injectable()
export class BffSecretService {
  private readonly expected: Buffer;

  constructor(config: AppConfigService) {
    this.expected = Buffer.from(config.bffInternalSecret, 'utf8');
  }

  isValid(value: string | string[] | undefined): boolean {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (!candidate) return false;

    const actual = Buffer.from(candidate, 'utf8');
    return (
      actual.length === this.expected.length &&
      timingSafeEqual(actual, this.expected)
    );
  }
}
