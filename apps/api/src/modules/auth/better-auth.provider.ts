// @file: apps/api/src/modules/auth/better-auth.provider.ts
import type { Provider } from '@nestjs/common';
import { z } from 'zod';

import { AppConfigService } from '@/config/app-config.service';
import { PrismaService } from '@/database/prisma/prisma.service';
import { AuthRedisService } from './redis.service';

const keycloakUuidSchema = z.string().uuid();
const keycloakProfileFields = new Set([
  'keycloakUuid',
  'givenName',
  'familyName',
]);

type KeycloakProfile = {
  sub?: unknown;
  given_name?: unknown;
  family_name?: unknown;
};

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isKeycloakCallback(
  context: { path?: unknown; request?: Request } | null,
): boolean {
  if (context?.path === '/callback/keycloak') return true;
  if (!context?.request) return false;
  return new URL(context.request.url).pathname.endsWith(
    '/api/auth/callback/keycloak',
  );
}

function containsKeycloakProfileField(data: Record<string, unknown>): boolean {
  return [...keycloakProfileFields].some((field) =>
    Object.prototype.hasOwnProperty.call(data, field),
  );
}

async function ensureDomainUser(
  prisma: PrismaService,
  keycloakUuid: string,
): Promise<void> {
  await prisma.user.upsert({
    where: { keycloakUuid },
    update: {},
    create: { keycloakUuid },
  });
}

export async function createBetterAuth(
  prisma: PrismaService,
  redis: AuthRedisService,
  config: AppConfigService,
) {
  const [
    { betterAuth },
    { prismaAdapter },
    { redisStorage },
    { genericOAuth },
  ] = await Promise.all([
    import('better-auth'),
    import('@better-auth/prisma-adapter'),
    import('@better-auth/redis-storage'),
    import('better-auth/plugins/generic-oauth'),
  ]);

  const cookieBaseName = config.sessionCookieName.replace(
    /^(?:__Host-|__Secure-)/,
    '',
  );

  return betterAuth({
    appName: 'HSS',
    baseURL: config.betterAuthUrl,
    basePath: '/api/auth',
    secret: config.betterAuthSecret,
    trustedOrigins: [config.betterAuthUrl],
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
      transaction: true,
    }),
    secondaryStorage: redisStorage({
      client: redis.client,
      keyPrefix: `${config.sessionKeyPrefix}ba:`,
    }),
    user: {
      modelName: 'AuthUser',
      additionalFields: {
        keycloakUuid: {
          type: 'string',
          required: true,
          input: true,
          validator: { input: keycloakUuidSchema },
        },
        givenName: { type: 'string', required: false, input: true },
        familyName: { type: 'string', required: false, input: true },
      },
    },
    account: {
      modelName: 'AuthAccount',
      identityStrategy: 'issuer',
      encryptOAuthTokens: true,
      storeStateStrategy: 'database',
    },
    session: {
      modelName: 'AuthSession',
      expiresIn: config.sessionAbsoluteTimeoutSeconds,
      disableSessionRefresh: true,
      storeSessionInDatabase: false,
      cookieCache: { enabled: false },
    },
    verification: { modelName: 'AuthVerification' },
    rateLimit: { enabled: true, storage: 'secondary-storage' },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            if (!isKeycloakCallback(context)) return false;
            const keycloakUuid = keycloakUuidSchema.parse(user.keycloakUuid);
            await ensureDomainUser(prisma, keycloakUuid);
          },
        },
        update: {
          before: async (user, context) => {
            if (!containsKeycloakProfileField(user)) return;
            if (!isKeycloakCallback(context)) return false;
            if (user.keycloakUuid !== undefined) {
              const keycloakUuid = keycloakUuidSchema.parse(user.keycloakUuid);
              await ensureDomainUser(prisma, keycloakUuid);
            }
          },
        },
      },
    },
    advanced: {
      useSecureCookies: true,
      cookies: {
        session_token: {
          name: cookieBaseName,
          attributes: {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
          },
        },
      },
      database: { joins: true },
    },
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: 'keycloak',
            name: 'Keycloak',
            clientId: config.authKeycloakClientId,
            clientSecret: config.authKeycloakClientSecret,
            discoveryUrl: `${config.keycloakIssuer}/.well-known/openid-configuration`,
            accountIssuer: config.keycloakIssuer,
            scopes: ['openid', 'profile', 'email'],
            pkce: true,
            requireIdTokenVerification: true,
            postLogoutRedirectURI: config.betterAuthUrl,
            mapProfileToUser: (rawProfile) => {
              const profile = rawProfile as KeycloakProfile;
              return {
                keycloakUuid: keycloakUuidSchema.parse(profile.sub),
                givenName: optionalString(profile.given_name),
                familyName: optionalString(profile.family_name),
              };
            },
          },
        ],
      }),
    ],
  });
}

export type BetterAuthInstance = Awaited<ReturnType<typeof createBetterAuth>>;
export const BETTER_AUTH = Symbol('BETTER_AUTH');

export const betterAuthProvider: Provider = {
  provide: BETTER_AUTH,
  inject: [PrismaService, AuthRedisService, AppConfigService],
  useFactory: createBetterAuth,
};
