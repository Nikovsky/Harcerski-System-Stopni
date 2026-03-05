// @file: apps/api/src/storage/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { AppConfigService } from '@/config/app-config.service';

type MinioError = Error & {
  code?: string;
};

type BucketPolicyStatement = {
  Effect?: string;
  Principal?: unknown;
};

type BucketPolicyDocument = {
  Statement?: BucketPolicyStatement | BucketPolicyStatement[];
};

function hasWildcardPrincipal(value: unknown): boolean {
  if (value === '*') return true;
  if (Array.isArray(value))
    return value.some((item) => hasWildcardPrincipal(item));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) =>
      hasWildcardPrincipal(item),
    );
  }
  return false;
}

function policyAllowsPublicAccess(rawPolicy: string): boolean {
  const parsed = JSON.parse(rawPolicy) as BucketPolicyDocument;
  const statements = Array.isArray(parsed.Statement)
    ? parsed.Statement
    : parsed.Statement
      ? [parsed.Statement]
      : [];

  return statements.some((statement) => {
    const effect =
      typeof statement.Effect === 'string'
        ? statement.Effect.toLowerCase()
        : undefined;
    return effect === 'allow' && hasWildcardPrincipal(statement.Principal);
  });
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;

  constructor(private readonly cfg: AppConfigService) {
    this.client = this.createClient();
  }

  async ensureBucketReady(): Promise<void> {
    const bucketName = this.cfg.minioBucketName;
    const exists = await this.client.bucketExists(bucketName);

    if (!exists) {
      throw new Error(
        `Bucket "${bucketName}" is missing. Provision it via the MinIO bootstrap job before starting API.`,
      );
    }

    await this.assertBucketIsPrivate(bucketName);
    this.logger.log(
      `Bucket "${bucketName}" is ready (private policy verified).`,
    );
  }

  private createClient(): MinioClient {
    const endpoint = new URL(this.cfg.minioEndpoint);
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
      throw new Error('MINIO_ENDPOINT must use http:// or https://');
    }
    if (this.cfg.nodeEnv === 'production' && endpoint.protocol !== 'https:') {
      throw new Error('MINIO_ENDPOINT must use https:// in production');
    }
    if (endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
      throw new Error('MINIO_ENDPOINT must not include path, query, or hash');
    }

    const port = endpoint.port ? Number.parseInt(endpoint.port, 10) : undefined;
    if (
      port !== undefined &&
      (!Number.isInteger(port) || port < 1 || port > 65535)
    ) {
      throw new Error('MINIO_ENDPOINT has invalid port');
    }

    return new MinioClient({
      endPoint: endpoint.hostname,
      ...(port !== undefined ? { port } : {}),
      useSSL: endpoint.protocol === 'https:',
      accessKey: this.cfg.minioAccessKey,
      secretKey: this.cfg.minioSecretKey,
      // Path-style avoids bucket-name-in-host requirements behind local reverse proxies.
      pathStyle: true,
    });
  }

  private async assertBucketIsPrivate(bucketName: string): Promise<void> {
    try {
      const rawPolicy = await this.client.getBucketPolicy(bucketName);
      if (!rawPolicy || !rawPolicy.trim()) return;

      if (policyAllowsPublicAccess(rawPolicy)) {
        throw new Error(
          `Bucket "${bucketName}" has a public access policy. Remove it before startup.`,
        );
      }
    } catch (error: unknown) {
      const minioError = error as MinioError;
      if (
        minioError.code === 'NoSuchBucketPolicy' ||
        minioError.code === 'NoSuchPolicy'
      ) {
        return;
      }
      if (minioError.code === 'AccessDenied') {
        if (this.cfg.nodeEnv === 'production') {
          throw new Error(
            `Cannot verify bucket policy for "${bucketName}" (AccessDenied). ` +
              'Grant s3:GetBucketPolicy to API credentials in production.',
          );
        }

        this.logger.warn(
          `Skipping bucket policy verification for "${bucketName}" (AccessDenied).`,
        );
        return;
      }

      if (error instanceof SyntaxError) {
        throw new Error(`Bucket "${bucketName}" has an invalid JSON policy.`);
      }

      throw error;
    }
  }
}
