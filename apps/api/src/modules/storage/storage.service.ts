// @file: apps/api/src/modules/storage/storage.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { AppConfigService } from '@/config/app-config.service';
import { randomUUID } from 'node:crypto';

type MinioListedObject = {
  name?: string;
  lastModified?: Date | string;
};

type EndpointConfig = {
  endPoint: string;
  port?: number;
  useSSL: boolean;
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private static readonly MAX_BUFFER_READ_BYTES = 8192;
  private readonly minio: Minio.Client;
  private readonly presignMinio: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly config: AppConfigService) {
    this.bucket = config.minioBucket;
    this.minio = this.createClient(config.minioEndpoint, config.minioUseSsl);

    // Browser-facing presigned URLs should use reverse-proxy/public endpoint.
    const publicEndpoint = config.minioPublicEndpoint?.trim();
    this.presignMinio =
      publicEndpoint && publicEndpoint.length > 0
        ? this.createClient(publicEndpoint, true)
        : this.minio;
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.minio.bucketExists(this.bucket);
      if (exists) {
        this.logger.log(`Bucket "${this.bucket}" already exists`);
        return;
      }

      await this.minio.makeBucket(this.bucket, this.config.minioRegion);
      this.logger.log(`Bucket "${this.bucket}" created`);
    } catch (error) {
      const message = this.formatStorageInitError(error);
      this.logger.error(message);
      throw error;
    }
  }

  generateObjectKey(prefix: string, filename: string): string {
    const ext = filename.includes('.') ? filename.split('.').pop() : '';
    return `${prefix}/${randomUUID()}${ext ? `.${ext}` : ''}`;
  }

  async presignUpload(
    objectKey: string,
    contentType: string,
    expiresIn = 600,
  ): Promise<string> {
    void contentType;
    return this.presignMinio.presignedPutObject(
      this.bucket,
      objectKey,
      expiresIn,
    );
  }

  async presignDownload(
    objectKey: string,
    filename?: string,
    options: { expiresIn?: number; inline?: boolean } = {},
  ): Promise<string> {
    const { expiresIn = 300, inline = false } = options;
    const disposition = this.buildContentDisposition(filename, inline);
    return this.presignMinio.presignedGetObject(this.bucket, objectKey, expiresIn, {
      'response-content-disposition': disposition,
    });
  }

  async headObject(
    objectKey: string,
  ): Promise<{ contentLength: number; contentType: string } | null> {
    try {
      const stat = await this.minio.statObject(this.bucket, objectKey);
      const metadata = stat.metaData as
        | Record<string, string | string[] | undefined>
        | undefined;
      const contentType =
        metadata?.['content-type'] ??
        metadata?.['Content-Type'] ??
        'application/octet-stream';
      const resolvedContentType = Array.isArray(contentType)
        ? contentType[0]
        : contentType;

      return {
        contentLength: stat.size ?? 0,
        contentType: resolvedContentType || 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async getObjectRange(
    objectKey: string,
    start: number,
    endExclusive: number,
  ): Promise<Buffer | null> {
    if (start < 0 || endExclusive <= start) {
      return null;
    }

    try {
      const stream = await this.minio.getPartialObject(
        this.bucket,
        objectKey,
        start,
        endExclusive - start,
      );
      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  async getObjectBuffer(
    objectKey: string,
    bytes = 4096,
  ): Promise<Buffer | null> {
    const safeBytes = Math.max(
      1,
      Math.min(bytes, StorageService.MAX_BUFFER_READ_BYTES),
    );
    return this.getObjectRange(objectKey, 0, safeBytes);
  }

  async listObjects(
    prefix: string,
  ): Promise<{ key: string; lastModified: Date }[]> {
    return new Promise((resolve, reject) => {
      const results: { key: string; lastModified: Date }[] = [];
      const stream = this.minio.listObjectsV2(this.bucket, prefix, true);

      stream.on('data', (obj: MinioListedObject) => {
        if (!obj.name || !obj.lastModified) {
          return;
        }

        const asDate =
          obj.lastModified instanceof Date
            ? obj.lastModified
            : new Date(obj.lastModified);

        if (Number.isNaN(asDate.getTime())) {
          return;
        }

        results.push({ key: obj.name, lastModified: asDate });
      });

      stream.on('error', (error: unknown) => reject(error));
      stream.on('end', () => resolve(results));
    });
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.minio.removeObject(this.bucket, objectKey);
    this.logger.log(`Deleted object: ${objectKey}`);
  }

  private createClient(endpointRaw: string, defaultUseSSL: boolean): Minio.Client {
    const endpoint = this.parseEndpoint(endpointRaw, defaultUseSSL);
    return new Minio.Client({
      endPoint: endpoint.endPoint,
      port: endpoint.port,
      useSSL: endpoint.useSSL,
      region: this.config.minioRegion,
      accessKey: this.config.minioAccessKey,
      secretKey: this.config.minioSecretKey,
    });
  }

  private parseEndpoint(raw: string, defaultUseSSL: boolean): EndpointConfig {
    const input = raw.trim();
    if (!input) {
      throw new Error('MINIO endpoint is empty');
    }

    if (input.includes('://')) {
      const url = new URL(input);
      const parsedPort = url.port ? Number(url.port) : undefined;
      return {
        endPoint: url.hostname,
        port: Number.isFinite(parsedPort) ? parsedPort : undefined,
        useSSL: url.protocol === 'https:',
      };
    }

    const hostPortMatch = /^(?<host>[^:]+)(?::(?<port>\d+))?$/.exec(input);
    if (!hostPortMatch || !hostPortMatch.groups?.host) {
      throw new Error(`Invalid MINIO endpoint format: "${raw}"`);
    }

    const parsedPort = hostPortMatch.groups.port
      ? Number(hostPortMatch.groups.port)
      : undefined;

    return {
      endPoint: hostPortMatch.groups.host,
      port: Number.isFinite(parsedPort) ? parsedPort : undefined,
      useSSL: defaultUseSSL,
    };
  }

  private formatStorageInitError(error: unknown): string {
    const code =
      typeof error === 'object' &&
      error &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code
        : undefined;

    const base =
      `Storage init failed for endpoint="${this.config.minioEndpoint}" ` +
      `(MINIO_USE_SSL=${this.config.minioUseSsl}, bucket="${this.bucket}")`;

    if (code === 'EPROTO') {
      return `${base}. TLS mismatch detected. If MINIO_ENDPOINT points to plain HTTP MinIO (e.g. localhost:9000), set MINIO_USE_SSL=false.`;
    }

    return base;
  }

  private buildContentDisposition(filename?: string, inline = false): string {
    const dispositionType = inline ? 'inline' : 'attachment';
    if (!filename) {
      return dispositionType;
    }

    const asciiFilename = this.toAsciiFilename(filename);
    const utf8Filename = encodeURIComponent(filename)
      .replace(
        /['()]/g,
        (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
      )
      .replace(/\*/g, '%2A');

    return `${dispositionType}; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`;
  }

  private toAsciiFilename(filename: string): string {
    const withoutControls = Array.from(filename)
      .map((ch) => {
        const code = ch.charCodeAt(0);
        return code <= 0x1f || code === 0x7f ? '_' : ch;
      })
      .join('');
    const escapedQuotes = withoutControls.replace(/["\\]/g, '_');
    const asciiOnly = escapedQuotes.replace(/[^\x20-\x7E]/g, '_').trim();
    return asciiOnly || 'file';
  }
}
