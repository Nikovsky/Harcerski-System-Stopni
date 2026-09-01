// @file: apps/api/src/modules/auth/redis.service.ts
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

import { AppConfigService } from '@/config/app-config.service';

@Injectable()
export class AuthRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthRedisService.name);
  readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      enableReadyCheck: false,
      connectTimeout: config.redisConnectTimeoutMs,
      commandTimeout: config.redisCommandTimeoutMs,
    });
    this.client.on('error', () => {
      this.logger.error('Redis connection error.');
    });
  }

  async onModuleInit(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    if (this.client.status !== 'ready') {
      await new Promise<void>((resolve, reject) => {
        this.client.once('ready', resolve);
        this.client.once('error', reject);
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') return;
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
