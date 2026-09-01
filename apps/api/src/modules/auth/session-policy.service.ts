// @file: apps/api/src/modules/auth/session-policy.service.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AppConfigService } from '@/config/app-config.service';
import { AuthRedisService } from './redis.service';

const sessionPolicySchema = z.object({
  idleExpiresAtMs: z.number().int().positive(),
  absoluteExpiresAtMs: z.number().int().positive(),
  lastTouchedAtMs: z.number().int().positive(),
});

type SessionPolicy = z.infer<typeof sessionPolicySchema>;

@Injectable()
export class SessionPolicyService {
  constructor(
    private readonly config: AppConfigService,
    private readonly redis: AuthRedisService,
  ) {}

  private key(sessionId: string): string {
    return `${this.config.sessionKeyPrefix}policy:${sessionId}`;
  }

  private async write(sessionId: string, policy: SessionPolicy): Promise<void> {
    const ttlMs = Math.max(1, policy.absoluteExpiresAtMs - Date.now());
    await this.redis.client.set(
      this.key(sessionId),
      JSON.stringify(policy),
      'PX',
      ttlMs,
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.client.del(this.key(sessionId));
  }

  async ensure(
    sessionId: string,
    absoluteExpiresAt: Date,
  ): Promise<SessionPolicy | null> {
    const now = Date.now();
    const raw = await this.redis.client.get(this.key(sessionId));

    if (raw) {
      let decoded: unknown;
      try {
        decoded = JSON.parse(raw) as unknown;
      } catch {
        await this.delete(sessionId);
        return null;
      }

      const parsed = sessionPolicySchema.safeParse(decoded);
      if (!parsed.success) {
        await this.delete(sessionId);
        return null;
      }
      if (
        parsed.data.idleExpiresAtMs <= now ||
        parsed.data.absoluteExpiresAtMs <= now
      ) {
        await this.delete(sessionId);
        return null;
      }
      return parsed.data;
    }

    const absoluteExpiresAtMs = absoluteExpiresAt.getTime();
    if (absoluteExpiresAtMs <= now) return null;

    const created: SessionPolicy = {
      idleExpiresAtMs: Math.min(
        now + this.config.sessionIdleTimeoutSeconds * 1_000,
        absoluteExpiresAtMs,
      ),
      absoluteExpiresAtMs,
      lastTouchedAtMs: now,
    };
    await this.write(sessionId, created);
    return created;
  }

  async touch(
    sessionId: string,
    absoluteExpiresAt: Date,
    extendSeconds?: number,
  ): Promise<{ policy: SessionPolicy | null; touched: boolean }> {
    const current = await this.ensure(sessionId, absoluteExpiresAt);
    if (!current) return { policy: null, touched: false };

    const now = Date.now();
    const throttleMs = this.config.sessionTouchThrottleSeconds * 1_000;
    if (now - current.lastTouchedAtMs < throttleMs) {
      return { policy: current, touched: false };
    }

    const requestedSeconds =
      extendSeconds ?? this.config.sessionIdleTimeoutSeconds;
    const allowedSeconds = Math.min(
      Math.max(1, requestedSeconds),
      this.config.sessionMaxExtensionSeconds,
    );
    const updated: SessionPolicy = {
      ...current,
      idleExpiresAtMs: Math.min(
        now + allowedSeconds * 1_000,
        current.absoluteExpiresAtMs,
      ),
      lastTouchedAtMs: now,
    };
    await this.write(sessionId, updated);
    return { policy: updated, touched: true };
  }
}
