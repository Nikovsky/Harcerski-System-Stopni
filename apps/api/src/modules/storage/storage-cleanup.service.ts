// @file: apps/api/src/modules/storage/storage-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/database/prisma/prisma.service';
import { StorageService } from './storage.service';

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOrphanedObjects(): Promise<void> {
    this.logger.log('Starting orphaned object-storage cleanup...');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let deleted = 0;
    let checked = 0;

    const objects = await this.storage.listObjects('instructor-applications/');

    for (const obj of objects) {
      // Skip objects younger than 1h (protect ongoing uploads)
      if (obj.lastModified > oneHourAgo) continue;

      checked++;
      const attachment = await this.prisma.attachment.findUnique({
        where: { objectKey: obj.key },
        select: { uuid: true },
      });

      if (!attachment) {
        await this.storage.deleteObject(obj.key);
        deleted++;
      }
    }

    this.logger.log(
      `Cleanup complete: checked=${checked}, deleted=${deleted}, total_objects=${objects.length}`,
    );
  }
}
