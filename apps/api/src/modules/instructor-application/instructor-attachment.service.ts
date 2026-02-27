// @file: apps/api/src/modules/instructor-application/instructor-attachment.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { PrismaService } from '@/database/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';
import { isInstructorApplicationEditable, MAX_FILE_SIZE } from '@hss/schemas';
import type {
  AuthPrincipal,
  PresignUploadRequest,
  ConfirmUploadRequest,
} from '@hss/schemas';

@Injectable()
export class InstructorAttachmentService {
  private readonly logger = new Logger(InstructorAttachmentService.name);

  private static readonly MAX_ATTACHMENTS_PER_APPLICATION = 50;
  private static readonly MAX_FILE_SIZE_MB_LABEL = MAX_FILE_SIZE / 1_000_000;
  private static readonly ORPHAN_UPLOAD_TTL_MS = 30 * 60 * 1000;
  private static readonly ZIP_STRUCTURE_SCAN_BYTES = 256 * 1024;
  private static readonly OOXML_CONTENT_TYPES_MARKER = Buffer.from(
    '[Content_Types].xml',
    'utf8',
  );

  private static readonly MAGIC_BYTES_ALLOWLIST = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'application/zip',
    'application/x-cfb',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  static sanitizeFilename(raw: string): string {
    let name = raw.replace(/[^\p{L}\p{N}.\-_ ]/gu, '_');

    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0) {
      const base = name.slice(0, lastDot).replace(/\./g, '_');
      const ext = name.slice(lastDot);
      name = base + ext;
    }

    name = name.replace(/_{2,}/g, '_').replace(/ {2,}/g, ' ').trim();

    return name || 'file';
  }

  async presignAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: PresignUploadRequest,
  ) {
    await this.ensureOwnDraft(principal, applicationId);
    await this.cleanupOrphanedUploads(applicationId);

    const attachmentCount = await this.prisma.attachment.count({
      where: { instructorApplicationUuid: applicationId, status: 'ACTIVE' },
    });
    if (
      attachmentCount >=
      InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION
    ) {
      throw new BadRequestException(
        `Osiągnięto limit ${InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION} załączników na wniosek`,
      );
    }

    const objectKey = this.storage.generateObjectKey(
      `instructor-applications/${applicationId}`,
      dto.filename,
    );

    const url = await this.storage.presignUpload(objectKey, dto.contentType);

    return { url, objectKey };
  }

  async confirmAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: ConfirmUploadRequest,
  ) {
    await this.ensureOwnDraft(principal, applicationId);

    const expectedPrefix = `instructor-applications/${applicationId}/`;
    if (!dto.objectKey.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        'Object key does not match this application',
      );
    }

    if (dto.requirementUuid) {
      const requirement =
        await this.prisma.instructorApplicationRequirement.findUnique({
          where: { uuid: dto.requirementUuid },
        });
      if (!requirement || requirement.applicationUuid !== applicationId) {
        throw new BadRequestException(
          'Requirement does not belong to this application',
        );
      }
    }

    const headResult = await this.storage.headObject(dto.objectKey);
    if (!headResult) {
      throw new BadRequestException('File not found in storage');
    }
    if (headResult.contentLength > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File exceeds maximum size of ${InstructorAttachmentService.MAX_FILE_SIZE_MB_LABEL} MB`,
      );
    }

    const buffer = await this.storage.getObjectRange(dto.objectKey, 0, 4100);
    if (buffer) {
      const detected = await fileTypeFromBuffer(buffer);
      if (
        detected &&
        !InstructorAttachmentService.MAGIC_BYTES_ALLOWLIST.has(detected.mime)
      ) {
        this.logger.warn(
          `Magic bytes mismatch: objectKey=${dto.objectKey}, detected=${detected.mime}, claimed=${dto.contentType}`,
        );
        await this.storage.deleteObject(dto.objectKey);
        throw new BadRequestException(
          `Typ pliku (${detected.mime}) nie jest dozwolony. Dozwolone: PDF, obrazy, wideo, dokumenty Office.`,
        );
      }
      if (detected?.mime === 'application/zip') {
        const officeZipExtensions = /\.(docx|pptx)$/i;
        if (!officeZipExtensions.test(dto.originalFilename)) {
          await this.storage.deleteObject(dto.objectKey);
          throw new BadRequestException(
            `Pliki ZIP nie są dozwolone. Dozwolone formaty Office: docx, pptx.`,
          );
        }

        const hasOfficeXmlStructure = await this.hasOfficeXmlStructure(
          dto.objectKey,
          headResult.contentLength,
        );
        if (!hasOfficeXmlStructure) {
          await this.storage.deleteObject(dto.objectKey);
          throw new BadRequestException(
            'Archiwum ZIP nie ma poprawnej struktury Office Open XML ([Content_Types].xml).',
          );
        }
      }
    }

    const sanitizedFilename = InstructorAttachmentService.sanitizeFilename(
      dto.originalFilename,
    );

    const attachment = await this.prisma.attachment.create({
      data: {
        instructorApplicationUuid: applicationId,
        instructorRequirementUuid: dto.requirementUuid ?? null,
        objectKey: dto.objectKey,
        originalFilename: sanitizedFilename,
        contentType: headResult.contentType,
        sizeBytes: BigInt(headResult.contentLength),
        checksum: dto.checksum ?? null,
      },
    });

    if (dto.isHufcowyPresence) {
      await this.prisma.instructorApplication.update({
        where: { uuid: applicationId },
        data: { hufcowyPresenceAttachmentUuid: attachment.uuid },
      });
    }

    return {
      uuid: attachment.uuid,
      originalFilename: attachment.originalFilename,
      contentType: attachment.contentType,
      sizeBytes: Number(attachment.sizeBytes),
      uploadedAt: attachment.uploadedAt.toISOString(),
    };
  }

  async deleteAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
  ) {
    const app = await this.ensureOwnDraft(principal, applicationId);

    const attachment = await this.prisma.attachment.findUnique({
      where: { uuid: attachmentId },
    });
    if (!attachment || attachment.instructorApplicationUuid !== applicationId) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      await this.storage.deleteObject(attachment.objectKey);
    } catch (e) {
      this.logger.warn(
        `Failed to delete S3 object ${attachment.objectKey}: ${e}`,
      );
    }

    if (app.hufcowyPresenceAttachmentUuid === attachmentId) {
      await this.prisma.instructorApplication.update({
        where: { uuid: applicationId },
        data: { hufcowyPresenceAttachmentUuid: null },
      });
    }

    await this.prisma.attachment.delete({ where: { uuid: attachmentId } });

    return { uuid: attachmentId };
  }

  async getAttachmentDownloadUrl(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
    inline = false,
  ) {
    const app = await this.prisma.instructorApplication.findUnique({
      where: { uuid: applicationId },
      include: {
        candidate: {
          select: { keycloakUuid: true },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.candidate.keycloakUuid !== principal.sub)
      throw new ForbiddenException();

    const attachment = await this.prisma.attachment.findUnique({
      where: { uuid: attachmentId },
    });
    if (!attachment || attachment.instructorApplicationUuid !== applicationId) {
      throw new NotFoundException('Attachment not found');
    }

    const url = await this.storage.presignDownload(
      attachment.objectKey,
      attachment.originalFilename,
      { inline },
    );
    return { url, filename: attachment.originalFilename };
  }

  private async ensureOwnDraft(
    principal: AuthPrincipal,
    applicationId: string,
  ) {
    const app = await this.prisma.instructorApplication.findUnique({
      where: { uuid: applicationId },
      include: {
        candidate: {
          select: { keycloakUuid: true },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.candidate.keycloakUuid !== principal.sub)
      throw new ForbiddenException();
    if (!isInstructorApplicationEditable(app.status)) {
      throw new BadRequestException('Application is not editable');
    }
    return app;
  }

  private async hasOfficeXmlStructure(
    objectKey: string,
    contentLength: number,
  ): Promise<boolean> {
    const scanBytes = Math.min(
      contentLength,
      InstructorAttachmentService.ZIP_STRUCTURE_SCAN_BYTES,
    );

    const headChunk = await this.storage.getObjectRange(objectKey, 0, scanBytes);
    if (
      headChunk?.includes(InstructorAttachmentService.OOXML_CONTENT_TYPES_MARKER)
    ) {
      return true;
    }

    if (contentLength <= scanBytes) {
      return false;
    }

    const tailStart = Math.max(0, contentLength - scanBytes);
    const tailChunk = await this.storage.getObjectRange(
      objectKey,
      tailStart,
      contentLength,
    );

    return (
      tailChunk?.includes(InstructorAttachmentService.OOXML_CONTENT_TYPES_MARKER) ??
      false
    );
  }

  private async cleanupOrphanedUploads(applicationId: string): Promise<void> {
    const prefix = `instructor-applications/${applicationId}/`;
    const objects = await this.storage.listObjects(prefix);
    if (objects.length === 0) {
      return;
    }

    const existingAttachments = await this.prisma.attachment.findMany({
      where: {
        instructorApplicationUuid: applicationId,
        status: 'ACTIVE',
      },
      select: { objectKey: true },
    });

    const referencedKeys = new Set(
      existingAttachments.map((attachment) => attachment.objectKey),
    );

    const staleBefore = new Date(
      Date.now() - InstructorAttachmentService.ORPHAN_UPLOAD_TTL_MS,
    );

    for (const object of objects) {
      if (referencedKeys.has(object.key)) {
        continue;
      }
      if (object.lastModified >= staleBefore) {
        continue;
      }

      try {
        await this.storage.deleteObject(object.key);
      } catch (error) {
        this.logger.warn(
          `Failed to clean orphaned upload ${object.key}: ${error}`,
        );
      }
    }
  }
}
