// @file: apps/api/src/modules/storage/storage.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfigService } from '@/config/app-config.service';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private static readonly MAX_BUFFER_READ_BYTES = 8192;
  private readonly s3: S3Client;
  private readonly presignS3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: AppConfigService) {
    this.bucket = config.minioBucket;

    // Internal client — talks to MinIO directly (HTTP, localhost)
    this.s3 = new S3Client({
      endpoint: `http://${config.minioEndpoint}`,
      region: config.minioRegion,
      credentials: {
        accessKeyId: config.minioAccessKey,
        secretAccessKey: config.minioSecretKey,
      },
      forcePathStyle: true,
    });

    // Presign client — generates URLs for browser (HTTPS via NGINX)
    // requestChecksumCalculation: "WHEN_REQUIRED" prevents SDK from adding
    // x-amz-checksum-* query params that MinIO rejects when browser PUTs
    const publicEndpoint = config.minioPublicEndpoint;
    this.presignS3 = publicEndpoint
      ? new S3Client({
          endpoint: `https://${publicEndpoint}`,
          region: config.minioRegion,
          credentials: {
            accessKeyId: config.minioAccessKey,
            secretAccessKey: config.minioSecretKey,
          },
          forcePathStyle: true,
          requestChecksumCalculation: 'WHEN_REQUIRED',
        })
      : this.s3;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists`);
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" created`);
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
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.presignS3, command, { expiresIn });
  }

  async presignDownload(
    objectKey: string,
    filename?: string,
    options: { expiresIn?: number; inline?: boolean } = {},
  ): Promise<string> {
    const { expiresIn = 300, inline = false } = options;
    const disposition = this.buildContentDisposition(filename, inline);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ResponseContentDisposition: disposition,
    });
    return getSignedUrl(this.presignS3, command, { expiresIn });
  }

  async headObject(
    objectKey: string,
  ): Promise<{ contentLength: number; contentType: string } | null> {
    try {
      const response = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return {
        contentLength: response.ContentLength ?? 0,
        contentType: response.ContentType ?? 'application/octet-stream',
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
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Range: `bytes=${start}-${endExclusive - 1}`,
        }),
      );
      const stream = response.Body;
      if (!stream) return null;
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
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
    const results: { key: string; lastModified: Date }[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const obj of response.Contents ?? []) {
        if (obj.Key && obj.LastModified) {
          results.push({ key: obj.Key, lastModified: obj.LastModified });
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return results;
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );
    this.logger.log(`Deleted object: ${objectKey}`);
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
    const withoutControls = filename.replace(/[\u0000-\u001F\u007F]/g, '_');
    const escapedQuotes = withoutControls.replace(/["\\]/g, '_');
    const asciiOnly = escapedQuotes.replace(/[^\x20-\x7E]/g, '_').trim();
    return asciiOnly || 'file';
  }
}
