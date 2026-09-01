// @file: apps/api/src/modules/auth/better-auth.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { AppConfigService } from '@/config/app-config.service';
import { PrismaService } from '@/database/prisma/prisma.service';
import { BETTER_AUTH, type BetterAuthInstance } from './better-auth.provider';
import { AuthRedisService } from './redis.service';
import { SessionPolicyService } from './session-policy.service';

const keycloakUuidSchema = z.string().uuid();

export type HssAuthSession = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  expires: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  accessToken?: string;
  error?: 'RefreshTokenExpired';
};

export type SessionTouchResult = {
  touched: boolean;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
};

@Injectable()
export class BetterAuthService {
  constructor(
    @Inject(BETTER_AUTH) readonly auth: BetterAuthInstance,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: AuthRedisService,
    private readonly policies: SessionPolicyService,
  ) {}

  private async releaseRefreshLock(
    lockKey: string,
    owner: string,
  ): Promise<void> {
    await this.redis.client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      lockKey,
      owner,
    );
  }

  private async waitForRefreshLock(
    lockKey: string,
    timeoutMs: number,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const remainingMs = await this.redis.client.pttl(lockKey);
      if (remainingMs <= 0) return;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(100, remainingMs)),
      );
    }
  }

  private async getAccessToken(
    accountId: string,
    userId: string,
    requestHeaders: Headers,
  ): Promise<string> {
    const lockKey = `${this.config.sessionKeyPrefix}lock:better-auth-refresh:${accountId}`;
    const owner = randomUUID();
    const lockTtl = this.config.sessionRefreshLockTtlMs;
    const acquired = await this.redis.client.set(
      lockKey,
      owner,
      'PX',
      lockTtl,
      'NX',
    );

    if (!acquired) {
      await this.waitForRefreshLock(lockKey, lockTtl);
    }

    try {
      const token = await this.auth.api.getAccessToken({
        headers: requestHeaders,
        body: { accountId, userId },
      });
      return token.accessToken;
    } finally {
      if (acquired) {
        await this.releaseRefreshLock(lockKey, owner);
      }
    }
  }

  async getSession(requestHeaders: Headers): Promise<HssAuthSession | null> {
    const current = await this.auth.api.getSession({ headers: requestHeaders });
    if (!current) return null;

    const policy = await this.policies.ensure(
      current.session.id,
      current.session.expiresAt,
    );
    if (!policy) {
      await this.auth.api.revokeSession({
        headers: requestHeaders,
        body: { token: current.session.token },
      });
      return null;
    }

    const keycloakUuid = keycloakUuidSchema.safeParse(
      current.user.keycloakUuid,
    );
    if (!keycloakUuid.success) return null;

    const account = await this.prisma.authAccount.findFirst({
      where: { userId: current.user.id, providerId: 'keycloak' },
      select: { id: true },
    });
    const baseSession: HssAuthSession = {
      user: {
        id: keycloakUuid.data,
        name: current.user.name ?? null,
        email: current.user.email ?? null,
        image: current.user.image ?? null,
      },
      expires: current.session.expiresAt.toISOString(),
      idleExpiresAt: new Date(policy.idleExpiresAtMs).toISOString(),
      absoluteExpiresAt: new Date(policy.absoluteExpiresAtMs).toISOString(),
    };

    if (!account) return baseSession;

    try {
      return {
        ...baseSession,
        accessToken: await this.getAccessToken(
          account.id,
          current.user.id,
          requestHeaders,
        ),
      };
    } catch {
      return { ...baseSession, error: 'RefreshTokenExpired' };
    }
  }

  async touchSession(
    requestHeaders: Headers,
    extendSeconds?: number,
  ): Promise<SessionTouchResult | null> {
    const current = await this.auth.api.getSession({ headers: requestHeaders });
    if (!current) return null;

    const touched = await this.policies.touch(
      current.session.id,
      current.session.expiresAt,
      extendSeconds,
    );
    if (!touched.policy) return null;

    return {
      touched: touched.touched,
      idleExpiresAt: new Date(touched.policy.idleExpiresAtMs).toISOString(),
      absoluteExpiresAt: new Date(
        touched.policy.absoluteExpiresAtMs,
      ).toISOString(),
    };
  }
}
