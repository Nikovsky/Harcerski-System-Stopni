// @file: apps/api/src/modules/storage/storage-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApplicationStatus, Prisma } from '@hss/database';
import { PrismaService } from '@/database/prisma/prisma.service';
import { StorageService } from './storage.service';

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);
  private static readonly STALE_DRAFT_ARCHIVE_DAYS = 31;
  private static readonly STALE_DRAFT_DELETE_AFTER_ARCHIVE_DAYS = 14;
  private static readonly STALE_DRAFT_CLEANUP_BATCH_SIZE = 100;
  private static readonly STALE_DRAFT_ADVISORY_LOCK_KEY = 91003145;

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

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupStaleInstructorDrafts(): Promise<void> {
    const txResult = await this.prisma.$transaction(async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ acquired: boolean }>>(
        Prisma.sql`SELECT pg_try_advisory_xact_lock(${StorageCleanupService.STALE_DRAFT_ADVISORY_LOCK_KEY}) AS acquired`,
      );
      const lockAcquired = lockRows[0]?.acquired ?? false;
      if (!lockAcquired) {
        return {
          lockAcquired: false,
          archivedCount: 0,
          deleteCandidates: 0,
          deletedApplications: 0,
          deletedAttachmentRecords: 0,
          objectKeysToDelete: [] as string[],
        };
      }

      const now = Date.now();
      const archiveCutoff = new Date(
        now - StorageCleanupService.STALE_DRAFT_ARCHIVE_DAYS * 24 * 60 * 60 * 1000,
      );
      const deleteCutoff = new Date(
        now -
          StorageCleanupService.STALE_DRAFT_DELETE_AFTER_ARCHIVE_DAYS *
            24 *
            60 *
            60 *
            1000,
      );

      const archived = await tx.instructorApplication.updateMany({
        where: {
          status: ApplicationStatus.DRAFT,
          updatedAt: { lt: archiveCutoff },
        },
        data: {
          status: ApplicationStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      });

      const staleArchivedDrafts = await tx.instructorApplication.findMany({
        where: {
          status: ApplicationStatus.ARCHIVED,
          archivedAt: { lt: deleteCutoff },
          lastSubmittedAt: null,
          approvedAt: null,
        },
        orderBy: { archivedAt: 'asc' },
        take: StorageCleanupService.STALE_DRAFT_CLEANUP_BATCH_SIZE,
        select: {
          uuid: true,
          attachments: {
            select: {
              objectKey: true,
            },
          },
        },
      });

      let deletedApplications = 0;
      let deletedAttachmentRecords = 0;
      const objectKeysToDelete: string[] = [];

      for (const staleDraft of staleArchivedDrafts) {
        await tx.$executeRaw(
          Prisma.sql`
            SELECT 1
              FROM "InstructorApplication"
             WHERE "uuid" = ${staleDraft.uuid}::uuid
             FOR UPDATE
          `,
        );

        await tx.meetingRegistration.deleteMany({
          where: {
            instructorApplicationUuid: staleDraft.uuid,
          },
        });

        const deleteAttachmentsResult = await tx.attachment.deleteMany({
          where: {
            instructorApplicationUuid: staleDraft.uuid,
          },
        });
        deletedAttachmentRecords += deleteAttachmentsResult.count;

        await tx.instructorApplication.delete({
          where: {
            uuid: staleDraft.uuid,
          },
        });
        deletedApplications += 1;

        for (const attachment of staleDraft.attachments) {
          objectKeysToDelete.push(attachment.objectKey);
        }
      }

      return {
        lockAcquired: true,
        archivedCount: archived.count,
        deleteCandidates: staleArchivedDrafts.length,
        deletedApplications,
        deletedAttachmentRecords,
        objectKeysToDelete,
      };
    });

    if (!txResult.lockAcquired) {
      this.logger.log(
        'Skipping stale instructor drafts cleanup - lock not acquired (another instance is running).',
      );
      return;
    }

    let deletedStorageObjects = 0;
    for (const objectKey of txResult.objectKeysToDelete) {
      try {
        await this.storage.deleteObject(objectKey);
        deletedStorageObjects += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to delete stale draft storage object ${objectKey}: ${String(error)}`,
        );
      }
    }

    this.logger.log(
      `Stale instructor drafts cleanup complete: archived=${txResult.archivedCount}, delete_candidates=${txResult.deleteCandidates}, deleted_apps=${txResult.deletedApplications}, deleted_attachment_records=${txResult.deletedAttachmentRecords}, deleted_storage_objects=${deletedStorageObjects}`,
    );
  }
}
