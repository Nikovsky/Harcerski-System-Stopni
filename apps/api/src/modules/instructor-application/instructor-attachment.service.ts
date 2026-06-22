// @file: apps/api/src/modules/instructor-application/instructor-attachment.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import {
  ApplicationStatus,
  InstructorFixRequestStatus,
  InstructorReviewRevisionRequestStatus,
  Prisma,
} from '@hss/database';
import { PrismaService } from '@/database/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';
import { InstructorApplicationAuditService } from '@/modules/instructor-application/instructor-application-audit.service';
import {
  canEditInstructorApplicationField,
  canEditInstructorHufcowyPresenceAttachment,
  canEditInstructorRequirementAttachments,
  canEditInstructorTopLevelAttachments,
  isInstructorApplicationEditable,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@hss/schemas';
import type {
  AuthPrincipal,
  PresignUploadRequest,
  ConfirmUploadRequest,
} from '@hss/schemas';
import {
  buildAttachmentRequirementMap,
  buildInstructorApplicationCandidateEditScope,
  PUBLISHED_FIX_REQUEST_SCOPE_SELECT,
  PUBLISHED_REVISION_REQUEST_SCOPE_SELECT,
  type PublishedFixRequestScopeRow,
  type PublishedRevisionRequestScopeRow,
} from './instructor-application-edit-scope';

const REVISION_REQUEST_ACTIVITY_SELECT = {
  uuid: true,
  candidateFirstViewedAt: true,
  candidateFirstEditedAt: true,
  candidateLastActivityAt: true,
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

type RevisionRequestActivityRow =
  Prisma.InstructorReviewRevisionRequestGetPayload<{
    select: typeof REVISION_REQUEST_ACTIVITY_SELECT;
  }>;

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
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]);
  private static readonly GENERIC_STORAGE_CONTENT_TYPE =
    'application/octet-stream';
  private static readonly DIRECTLY_DETECTABLE_CONTENT_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ] satisfies readonly string[]);
  private static readonly OOXML_CONTENT_TYPE_BY_EXTENSION = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  } as const;
  private static readonly LEGACY_OFFICE_CONTENT_TYPE_BY_EXTENSION = {
    doc: 'application/msword',
    ppt: 'application/vnd.ms-powerpoint',
  } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly auditService: InstructorApplicationAuditService,
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
    requestId?: string | null,
  ) {
    const app = await this.ensureOwnEditableApplication(
      principal,
      applicationId,
    );
    const isHufcowyPresenceAttachment =
      !dto.requirementUuid && app.hufcowyPresence === 'ATTACHMENT_OPINION';
    this.ensureAttachmentEditAllowed(
      app.status,
      app.reviewRevisionRequests[0] ?? null,
      app.fixRequests[0] ?? null,
      dto.requirementUuid ?? null,
      buildAttachmentRequirementMap(app.attachments),
      app.hufcowyPresenceAttachmentUuid ?? null,
      { isHufcowyPresenceAttachment },
    );
    await this.ensureRequirementBelongsToApplication(
      applicationId,
      dto.requirementUuid ?? null,
    );
    await this.cleanupOrphanedUploads(applicationId);

    const attachmentCount = await this.prisma.attachment.count({
      where: { instructorApplicationUuid: applicationId, status: 'ACTIVE' },
    });
    if (
      attachmentCount >=
      InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION
    ) {
      throw this.buildBadRequestException(
        'ATTACHMENT_LIMIT_REACHED',
        `Osiągnięto limit ${InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION} załączników na wniosek`,
        {
          maxAttachments:
            InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION,
        },
      );
    }

    const objectKey = this.storage.generateObjectKey(
      `instructor-applications/${applicationId}`,
      dto.filename,
    );

    const url = await this.storage.presignUpload(objectKey, dto.contentType);

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_ATTACHMENT_PRESIGNED',
      targetType: 'INSTRUCTOR_APPLICATION',
      targetUuid: applicationId,
      requestId,
      metadata: {
        objectKey,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        requirementUuid: dto.requirementUuid ?? null,
      },
    });

    return { url, objectKey };
  }

  async confirmAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: ConfirmUploadRequest,
    requestId?: string | null,
  ) {
    const app = await this.ensureOwnEditableApplication(
      principal,
      applicationId,
    );
    const isHufcowyPresenceAttachment = dto.isHufcowyPresence === true;
    this.ensureAttachmentEditAllowed(
      app.status,
      app.reviewRevisionRequests[0] ?? null,
      app.fixRequests[0] ?? null,
      dto.requirementUuid ?? null,
      buildAttachmentRequirementMap(app.attachments),
      app.hufcowyPresenceAttachmentUuid ?? null,
      { isHufcowyPresenceAttachment },
    );

    const expectedPrefix = `instructor-applications/${applicationId}/`;
    if (!dto.objectKey.startsWith(expectedPrefix)) {
      throw this.buildBadRequestException(
        'ATTACHMENT_OBJECT_KEY_MISMATCH',
        'Object key does not match this application',
        {
          applicationId,
        },
      );
    }

    const headResult = await this.storage.headObject(dto.objectKey);
    if (!headResult) {
      throw this.buildBadRequestException(
        'ATTACHMENT_OBJECT_MISSING',
        'File not found in storage',
      );
    }
    if (headResult.contentLength > MAX_FILE_SIZE) {
      await this.deleteObjectQuietly(
        dto.objectKey,
        'oversized confirmed attachment cleanup',
      );
      throw this.buildBadRequestException(
        'ATTACHMENT_TOO_LARGE',
        `File exceeds maximum size of ${InstructorAttachmentService.MAX_FILE_SIZE_MB_LABEL} MB`,
        {
          maxSizeBytes: MAX_FILE_SIZE,
          storedSizeBytes: headResult.contentLength,
        },
      );
    }

    const persistedContentType =
      await this.resolveValidatedContentTypeOrReject(dto, headResult);

    const sanitizedFilename = InstructorAttachmentService.sanitizeFilename(
      dto.originalFilename,
    );

    let attachment: {
      uuid: string;
      originalFilename: string;
      contentType: string;
      sizeBytes: bigint;
      uploadedAt: Date;
    };
    let replacedAttachmentObjectKey: string | null = null;
    try {
      const transactionResult = await this.prisma.$transaction(async (tx) => {
        await this.lockApplicationRow(tx, applicationId);
        const editableApp = await this.ensureOwnEditableApplication(
          principal,
          applicationId,
          tx,
        );
        this.ensureAttachmentEditAllowed(
          editableApp.status,
          editableApp.reviewRevisionRequests[0] ?? null,
          editableApp.fixRequests[0] ?? null,
          dto.requirementUuid ?? null,
          buildAttachmentRequirementMap(editableApp.attachments),
          editableApp.hufcowyPresenceAttachmentUuid ?? null,
          { isHufcowyPresenceAttachment },
        );

        if (dto.requirementUuid) {
          await this.ensureRequirementBelongsToApplication(
            applicationId,
            dto.requirementUuid,
            tx,
          );
        }

        const attachmentCount = await tx.attachment.count({
          where: { instructorApplicationUuid: applicationId, status: 'ACTIVE' },
        });
        if (
          attachmentCount >=
          InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION
        ) {
          throw this.buildBadRequestException(
            'ATTACHMENT_LIMIT_REACHED',
            `Osiągnięto limit ${InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION} załączników na wniosek`,
            {
              maxAttachments:
                InstructorAttachmentService.MAX_ATTACHMENTS_PER_APPLICATION,
            },
          );
        }

        const attachment = await tx.attachment.create({
          data: {
            instructorApplicationUuid: applicationId,
            instructorRequirementUuid: dto.requirementUuid ?? null,
            objectKey: dto.objectKey,
            originalFilename: sanitizedFilename,
            contentType: persistedContentType,
            sizeBytes: BigInt(headResult.contentLength),
            checksum: dto.checksum ?? null,
          },
          select: {
            uuid: true,
            originalFilename: true,
            contentType: true,
            sizeBytes: true,
            uploadedAt: true,
          },
        });

        let previousHufcowyAttachmentObjectKey: string | null = null;

        if (dto.isHufcowyPresence) {
          if (
            editableApp.hufcowyPresenceAttachmentUuid &&
            editableApp.hufcowyPresenceAttachmentUuid !== attachment.uuid
          ) {
            const previousHufcowyAttachment = await tx.attachment.findUnique({
              where: { uuid: editableApp.hufcowyPresenceAttachmentUuid },
              select: {
                uuid: true,
                objectKey: true,
                status: true,
              },
            });

            if (
              previousHufcowyAttachment &&
              previousHufcowyAttachment.status === 'ACTIVE'
            ) {
              await tx.attachment.update({
                where: { uuid: previousHufcowyAttachment.uuid },
                data: { status: 'INACTIVE' },
              });
              previousHufcowyAttachmentObjectKey =
                previousHufcowyAttachment.objectKey;
            }
          }

          await tx.instructorApplication.update({
            where: { uuid: applicationId },
            data: { hufcowyPresenceAttachmentUuid: attachment.uuid },
          });
        }

        await this.markCandidateRevisionRequestEdited(
          tx,
          applicationId,
          editableApp.reviewRevisionRequests[0] ?? null,
        );

        return {
          attachment,
          previousHufcowyAttachmentObjectKey,
        };
      });
      attachment = transactionResult.attachment;
      replacedAttachmentObjectKey =
        transactionResult.previousHufcowyAttachmentObjectKey;
    } catch (error) {
      try {
        await this.storage.deleteObject(dto.objectKey);
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to remove object after confirm error for ${dto.objectKey}: ${cleanupError}`,
        );
      }
      throw error;
    }

    if (replacedAttachmentObjectKey) {
      try {
        await this.storage.deleteObject(replacedAttachmentObjectKey);
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to remove replaced district leader opinion object ${replacedAttachmentObjectKey}: ${cleanupError}`,
        );
      }
    }

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_ATTACHMENT_CONFIRMED',
      targetType: 'INSTRUCTOR_ATTACHMENT',
      targetUuid: attachment.uuid,
      requestId,
      metadata: {
        applicationId,
        requirementUuid: dto.requirementUuid ?? null,
        isHufcowyPresence: dto.isHufcowyPresence ?? false,
        contentType: attachment.contentType,
        sizeBytes: Number(attachment.sizeBytes),
      },
    });

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
    requestId?: string | null,
  ) {
    const attachmentObjectKey = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationId);
      const app = await this.ensureOwnEditableApplication(
        principal,
        applicationId,
        tx,
      );

      const attachment = await tx.attachment.findUnique({
        where: { uuid: attachmentId },
        select: {
          uuid: true,
          objectKey: true,
          instructorApplicationUuid: true,
          instructorRequirementUuid: true,
          status: true,
        },
      });
      if (
        !attachment ||
        attachment.instructorApplicationUuid !== applicationId ||
        attachment.status !== 'ACTIVE'
      ) {
        throw this.buildNotFoundException(
          'ATTACHMENT_NOT_FOUND',
          'Attachment not found',
        );
      }
      this.ensureAttachmentEditAllowed(
        app.status,
        app.reviewRevisionRequests[0] ?? null,
        app.fixRequests[0] ?? null,
        attachment.instructorRequirementUuid ?? null,
        buildAttachmentRequirementMap(app.attachments),
        app.hufcowyPresenceAttachmentUuid ?? null,
        {
          isHufcowyPresenceAttachment:
            app.hufcowyPresenceAttachmentUuid === attachmentId,
        },
      );

      if (app.hufcowyPresenceAttachmentUuid === attachmentId) {
        await tx.instructorApplication.update({
          where: { uuid: applicationId },
          data: { hufcowyPresenceAttachmentUuid: null },
        });
      }

      await tx.attachment.update({
        where: { uuid: attachmentId },
        data: { status: 'INACTIVE' },
      });
      await this.markCandidateRevisionRequestEdited(
        tx,
        applicationId,
        app.reviewRevisionRequests[0] ?? null,
      );
      return attachment.objectKey;
    });

    try {
      await this.storage.deleteObject(attachmentObjectKey);
    } catch (e) {
      this.logger.warn(
        `Failed to delete storage object ${attachmentObjectKey}: ${e}`,
      );
    }

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_ATTACHMENT_DELETED',
      targetType: 'INSTRUCTOR_ATTACHMENT',
      targetUuid: attachmentId,
      requestId,
      metadata: {
        applicationId,
      },
    });

    return { uuid: attachmentId };
  }

  async getAttachmentDownloadUrl(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
    inline = false,
    requestId?: string | null,
  ) {
    const app = await this.prisma.instructorApplication.findUnique({
      where: { uuid: applicationId },
      include: {
        candidate: {
          select: { keycloakUuid: true },
        },
      },
    });
    if (!app) {
      throw this.buildNotFoundException(
        'APPLICATION_NOT_FOUND',
        'Application not found',
      );
    }
    if (app.candidate.keycloakUuid !== principal.sub)
      throw this.buildForbiddenException(
        'APPLICATION_ACCESS_FORBIDDEN',
        'You do not have access to this application.',
      );

    const attachment = await this.prisma.attachment.findUnique({
      where: { uuid: attachmentId },
      select: {
        uuid: true,
        instructorApplicationUuid: true,
        objectKey: true,
        originalFilename: true,
        status: true,
      },
    });
    if (
      !attachment ||
      attachment.instructorApplicationUuid !== applicationId ||
      attachment.status !== 'ACTIVE'
    ) {
      throw this.buildNotFoundException(
        'ATTACHMENT_NOT_FOUND',
        'Attachment not found',
      );
    }

    const url = await this.storage.presignDownload(
      attachment.objectKey,
      attachment.originalFilename,
      { inline },
    );

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_ATTACHMENT_DOWNLOAD_URL_ISSUED',
      targetType: 'INSTRUCTOR_ATTACHMENT',
      targetUuid: attachment.uuid,
      requestId,
      metadata: {
        applicationId,
        inline,
      },
    });

    return { url, filename: attachment.originalFilename };
  }

  private async ensureOwnEditableApplication(
    principal: AuthPrincipal,
    applicationId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const app = await client.instructorApplication.findUnique({
      where: { uuid: applicationId },
      select: {
        uuid: true,
        status: true,
        hufcowyPresence: true,
        hufcowyPresenceAttachmentUuid: true,
        candidate: {
          select: { keycloakUuid: true },
        },
        reviewRevisionRequests: {
          where: {
            status: InstructorReviewRevisionRequestStatus.PUBLISHED,
          },
          orderBy: { publishedAt: 'desc' },
          take: 1,
          select: PUBLISHED_REVISION_REQUEST_SCOPE_SELECT,
        },
        fixRequests: {
          where: {
            status: InstructorFixRequestStatus.PUBLISHED,
          },
          orderBy: { publishedAt: 'desc' },
          take: 1,
          select: PUBLISHED_FIX_REQUEST_SCOPE_SELECT,
        },
        attachments: {
          select: {
            uuid: true,
            instructorRequirementUuid: true,
          },
        },
      },
    });
    if (!app) {
      throw this.buildNotFoundException(
        'APPLICATION_NOT_FOUND',
        'Application not found',
      );
    }
    if (app.candidate.keycloakUuid !== principal.sub)
      throw this.buildForbiddenException(
        'APPLICATION_ACCESS_FORBIDDEN',
        'You do not have access to this application.',
      );
    if (!isInstructorApplicationEditable(app.status)) {
      throw new BadRequestException({
        code: 'APPLICATION_NOT_EDITABLE',
        message: 'Application is not editable',
      });
    }
    return app;
  }

  private async findPublishedRevisionRequestActivity(
    client: PrismaService | Prisma.TransactionClient,
    applicationId: string,
  ): Promise<RevisionRequestActivityRow | null> {
    return client.instructorReviewRevisionRequest.findFirst({
      where: {
        applicationUuid: applicationId,
        status: InstructorReviewRevisionRequestStatus.PUBLISHED,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: REVISION_REQUEST_ACTIVITY_SELECT,
    });
  }

  private async markCandidateRevisionRequestEdited(
    client: PrismaService | Prisma.TransactionClient,
    applicationId: string,
    publishedRevisionRequest:
      | PublishedRevisionRequestScopeRow
      | null
      | undefined = null,
  ): Promise<void> {
    const request =
      publishedRevisionRequest ??
      (await this.findPublishedRevisionRequestActivity(client, applicationId));

    if (!request) {
      return;
    }

    const now = new Date();
    await client.instructorReviewRevisionRequest.update({
      where: { uuid: request.uuid },
      data: {
        candidateLastActivityAt: now,
        ...(request.candidateFirstViewedAt
          ? {}
          : { candidateFirstViewedAt: now }),
        ...(request.candidateFirstEditedAt
          ? {}
          : { candidateFirstEditedAt: now }),
      },
    });
  }

  private ensureAttachmentEditAllowed(
    status: ApplicationStatus,
    publishedRevisionRequest: PublishedRevisionRequestScopeRow | null,
    legacyPublishedFixRequest: PublishedFixRequestScopeRow | null,
    requirementUuid: string | null,
    attachmentRequirementByUuid: ReadonlyMap<string, string | null> = new Map(),
    hufcowyPresenceAttachmentUuid: string | null = null,
    options: { isHufcowyPresenceAttachment?: boolean } = {},
  ): void {
    if (status !== ApplicationStatus.TO_FIX) {
      return;
    }

    const scope = buildInstructorApplicationCandidateEditScope(
      status,
      publishedRevisionRequest,
      legacyPublishedFixRequest,
      attachmentRequirementByUuid,
      hufcowyPresenceAttachmentUuid,
    );

    if (requirementUuid) {
      if (canEditInstructorRequirementAttachments(scope, requirementUuid)) {
        return;
      }

      throw new ForbiddenException({
        code: 'ATTACHMENT_UPDATE_NOT_ALLOWED',
        message:
          'Możesz zmieniać załączniki tylko w zadaniach wyraźnie odblokowanych przez komisję.',
        details: {
          requirementUuid,
        },
      });
    }

    if (options.isHufcowyPresenceAttachment) {
      if (
        canEditInstructorHufcowyPresenceAttachment(scope) ||
        canEditInstructorApplicationField(scope, 'hufcowyPresence')
      ) {
        return;
      }

      throw new ForbiddenException({
        code: 'ATTACHMENT_UPDATE_NOT_ALLOWED',
        message:
          'Możesz zmienić opinię hufcowego tylko wtedy, gdy komisja odblokowała to pole lub sam załącznik.',
      });
    }

    if (canEditInstructorTopLevelAttachments(scope)) {
      return;
    }

    throw new ForbiddenException({
      code: 'ATTACHMENT_UPDATE_NOT_ALLOWED',
      message:
        'Możesz zmieniać załączniki ogólne tylko wtedy, gdy komisja je wyraźnie odblokowała.',
    });
  }

  private async ensureRequirementBelongsToApplication(
    applicationId: string,
    requirementUuid: string | null,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    if (!requirementUuid) {
      return;
    }

    const requirement =
      await client.instructorApplicationRequirement.findUnique({
        where: { uuid: requirementUuid },
        select: {
          applicationUuid: true,
        },
      });
    if (!requirement || requirement.applicationUuid !== applicationId) {
      throw this.buildBadRequestException(
        'ATTACHMENT_REQUIREMENT_MISMATCH',
        'Requirement does not belong to this application',
        {
          applicationId,
          requirementUuid,
        },
      );
    }
  }

  private async resolveValidatedContentTypeOrReject(
    dto: ConfirmUploadRequest,
    headResult: { contentLength: number; contentType: string },
  ): Promise<string> {
    const declaredContentType = this.normalizeContentType(dto.contentType);
    const storedContentType = this.normalizeContentType(headResult.contentType);

    if (dto.sizeBytes !== headResult.contentLength) {
      await this.rejectConfirmedObject(
        dto.objectKey,
        this.buildBadRequestException(
          'ATTACHMENT_SIZE_MISMATCH',
          'Declared file size does not match the stored object size.',
          {
            declaredSizeBytes: dto.sizeBytes,
            storedSizeBytes: headResult.contentLength,
          },
        ),
        'attachment size mismatch cleanup',
      );
    }

    if (
      storedContentType &&
      storedContentType !==
        InstructorAttachmentService.GENERIC_STORAGE_CONTENT_TYPE &&
      storedContentType !== declaredContentType
    ) {
      await this.rejectConfirmedObject(
        dto.objectKey,
        this.buildBadRequestException(
          'ATTACHMENT_CONTENT_TYPE_MISMATCH',
          'Stored object content type does not match the declared upload type.',
          {
            declaredContentType,
            storedContentType,
          },
        ),
        'attachment content type mismatch cleanup',
      );
    }

    const buffer = await this.storage.getObjectRange(dto.objectKey, 0, 8192);
    if (!buffer || buffer.length === 0) {
      await this.rejectConfirmedObject(
        dto.objectKey,
        this.buildBadRequestException(
          'ATTACHMENT_SIGNATURE_UNAVAILABLE',
          'Unable to verify the uploaded file signature.',
        ),
        'attachment signature unavailable cleanup',
      );
    }

    const verifiedBuffer = buffer!;
    const detectedMime = this.normalizeContentType(
      (await fileTypeFromBuffer(verifiedBuffer))?.mime,
    );
    if (!detectedMime) {
      await this.rejectConfirmedObject(
        dto.objectKey,
        this.buildBadRequestException(
          'ATTACHMENT_TYPE_UNDETERMINED',
          'Unable to determine the uploaded file type from its binary signature.',
          {
            allowedContentTypes: [...ALLOWED_MIME_TYPES],
          },
        ),
        'attachment type undetermined cleanup',
      );
    }

    if (
      !InstructorAttachmentService.MAGIC_BYTES_ALLOWLIST.has(detectedMime)
    ) {
      this.logger.warn(
        `Magic bytes mismatch: objectKey=${dto.objectKey}, detected=${detectedMime}, claimed=${declaredContentType}`,
      );
      await this.rejectConfirmedObject(
        dto.objectKey,
        this.buildBadRequestException(
          'ATTACHMENT_TYPE_NOT_ALLOWED',
          `Typ pliku (${detectedMime}) nie jest dozwolony. Dozwolone: PDF, obrazy, wideo, dokumenty Office.`,
          {
            declaredContentType,
            detectedContentType: detectedMime,
          },
        ),
        'attachment type not allowed cleanup',
      );
    }

    const extension = this.getFilenameExtension(dto.originalFilename);

    if (detectedMime === 'application/zip') {
      const expectedContentType = extension
        ? InstructorAttachmentService.OOXML_CONTENT_TYPE_BY_EXTENSION[
            extension as keyof typeof InstructorAttachmentService.OOXML_CONTENT_TYPE_BY_EXTENSION
          ] ?? null
        : null;

      if (!expectedContentType) {
        return this.rejectConfirmedObject(
          dto.objectKey,
          this.buildBadRequestException(
            'ATTACHMENT_ZIP_NOT_ALLOWED',
            'Pliki ZIP nie są dozwolone. Dozwolone formaty Office: docx, pptx.',
          ),
          'attachment zip cleanup',
        );
      }

      if (declaredContentType !== expectedContentType) {
        await this.rejectConfirmedObject(
          dto.objectKey,
          this.buildBadRequestException(
            'ATTACHMENT_CONTENT_TYPE_MISMATCH',
            'Declared upload type does not match the detected Office file signature.',
            {
              declaredContentType,
              detectedContentType: detectedMime,
              expectedContentType,
              extension,
            },
          ),
          'attachment office content type mismatch cleanup',
        );
      }

      const hasOfficeXmlStructure = await this.hasOfficeXmlStructure(
        dto.objectKey,
        headResult.contentLength,
      );
      if (!hasOfficeXmlStructure) {
        await this.rejectConfirmedObject(
          dto.objectKey,
          this.buildBadRequestException(
            'ATTACHMENT_INVALID_OOXML_STRUCTURE',
            'Archiwum ZIP nie ma poprawnej struktury Office Open XML ([Content_Types].xml).',
          ),
          'attachment invalid ooxml cleanup',
        );
      }

      const resolvedContentType = expectedContentType;
      return resolvedContentType;
    }

    if (detectedMime === 'application/x-cfb') {
      const expectedContentType = extension
        ? InstructorAttachmentService.LEGACY_OFFICE_CONTENT_TYPE_BY_EXTENSION[
            extension as keyof typeof InstructorAttachmentService.LEGACY_OFFICE_CONTENT_TYPE_BY_EXTENSION
          ] ?? null
        : null;

      if (!expectedContentType) {
        return this.rejectConfirmedObject(
          dto.objectKey,
          this.buildBadRequestException(
            'ATTACHMENT_LEGACY_OFFICE_EXTENSION_MISMATCH',
            'Plik legacy Office musi mieć rozszerzenie doc albo ppt.',
            {
              extension,
            },
          ),
          'attachment legacy office extension mismatch cleanup',
        );
      }

      if (declaredContentType !== expectedContentType) {
        await this.rejectConfirmedObject(
          dto.objectKey,
          this.buildBadRequestException(
            'ATTACHMENT_CONTENT_TYPE_MISMATCH',
            'Declared upload type does not match the detected legacy Office signature.',
            {
              declaredContentType,
              detectedContentType: detectedMime,
              expectedContentType,
              extension,
            },
          ),
          'attachment legacy office content type mismatch cleanup',
        );
      }

      const resolvedContentType = expectedContentType;
      return resolvedContentType;
    }

    if (
      !InstructorAttachmentService.DIRECTLY_DETECTABLE_CONTENT_TYPES.has(
        detectedMime,
      )
    ) {
      await this.rejectConfirmedObject(
        dto.objectKey,
        this.buildBadRequestException(
          'ATTACHMENT_CONTENT_TYPE_UNSUPPORTED',
          'The detected file signature is not supported for instructor application uploads.',
          {
            declaredContentType,
            detectedContentType: detectedMime,
          },
        ),
        'attachment unsupported content type cleanup',
      );
    }

    if (declaredContentType !== detectedMime) {
      await this.rejectConfirmedObject(
        dto.objectKey,
        this.buildBadRequestException(
          'ATTACHMENT_CONTENT_TYPE_MISMATCH',
          'Declared upload type does not match the detected file signature.',
          {
            declaredContentType,
            detectedContentType: detectedMime,
          },
        ),
        'attachment direct content type mismatch cleanup',
      );
    }

    return declaredContentType;
  }

  private async lockApplicationRow(
    tx: Prisma.TransactionClient,
    applicationId: string,
  ): Promise<void> {
    await tx.$executeRaw(
      Prisma.sql`
        SELECT 1
          FROM "InstructorApplication"
         WHERE "uuid" = ${applicationId}::uuid
         FOR UPDATE
      `,
    );
  }

  private async hasOfficeXmlStructure(
    objectKey: string,
    contentLength: number,
  ): Promise<boolean> {
    const scanBytes = Math.min(
      contentLength,
      InstructorAttachmentService.ZIP_STRUCTURE_SCAN_BYTES,
    );

    const headChunk = await this.storage.getObjectRange(
      objectKey,
      0,
      scanBytes,
    );
    if (
      headChunk?.includes(
        InstructorAttachmentService.OOXML_CONTENT_TYPES_MARKER,
      )
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
      tailChunk?.includes(
        InstructorAttachmentService.OOXML_CONTENT_TYPES_MARKER,
      ) ?? false
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

  private normalizeContentType(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? '';
  }

  private getFilenameExtension(filename: string): string | null {
    const normalized = filename.trim().toLowerCase();
    const match = /\.([a-z0-9]+)$/.exec(normalized);
    return match?.[1] ?? null;
  }

  private buildBadRequestException(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): BadRequestException {
    return new BadRequestException({
      code,
      message,
      ...(details ? { details } : {}),
    });
  }

  private buildForbiddenException(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): ForbiddenException {
    return new ForbiddenException({
      code,
      message,
      ...(details ? { details } : {}),
    });
  }

  private buildNotFoundException(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): NotFoundException {
    return new NotFoundException({
      code,
      message,
      ...(details ? { details } : {}),
    });
  }

  private async rejectConfirmedObject(
    objectKey: string,
    exception: BadRequestException,
    context: string,
  ): Promise<never> {
    await this.deleteObjectQuietly(objectKey, context);
    throw exception;
  }

  private async deleteObjectQuietly(
    objectKey: string,
    context: string,
  ): Promise<void> {
    try {
      await this.storage.deleteObject(objectKey);
    } catch (cleanupError) {
      this.logger.warn(
        `Failed to remove object during ${context} for ${objectKey}: ${cleanupError}`,
      );
    }
  }
}
