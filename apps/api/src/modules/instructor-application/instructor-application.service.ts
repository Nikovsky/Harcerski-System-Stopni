// @file: apps/api/src/modules/instructor-application/instructor-application.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import {
  ApplicationStatus,
  InstructorFixRequestStatus,
  InstructorReviewCandidateAnnotationStatus,
  InstructorReviewRevisionRequestStatus,
  Prisma,
  RequirementState,
} from '@hss/database';
import { createHash } from 'node:crypto';
import { InstructorAttachmentService } from '@/modules/instructor-application/instructor-attachment.service';
import { InstructorApplicationValidationService } from '@/modules/instructor-application/instructor-application-validation.service';
import { InstructorApplicationAuditService } from '@/modules/instructor-application/instructor-application-audit.service';
import { StorageService } from '@/modules/storage/storage.service';
import type { AuthPrincipal } from '@hss/schemas';
import {
  canEditInstructorApplicationField,
  canEditInstructorRequirement,
  isInstructorApplicationEditable,
  isOptionalInstructorRequirement,
} from '@hss/schemas';
import type {
  CreateInstructorApplication,
  EditableInstructorApplicationField,
  InstructorApplicationCandidateRevisionActivityResponse,
  UpdateInstructorApplication,
  UpdateInstructorRequirement,
  PresignUploadRequest,
  ConfirmUploadRequest,
  InstructorApplicationProfileCheckResponse,
} from '@hss/schemas';
import {
  buildAttachmentRequirementMap,
  buildInstructorApplicationCandidateEditScope,
  PUBLISHED_FIX_REQUEST_SCOPE_SELECT,
  PUBLISHED_REVISION_REQUEST_SCOPE_SELECT,
  type PublishedFixRequestScopeRow,
  type PublishedRevisionRequestScopeRow,
} from './instructor-application-edit-scope';

const INSTRUCTOR_APPLICATION_AUDIT_SELECT = {
  plannedFinishAt: true,
  teamFunction: true,
  hufiecFunction: true,
  openTrialForRank: true,
  openTrialDeadline: true,
  hufcowyPresence: true,
  hufcowyPresenceAttachmentUuid: true,
  functionsHistory: true,
  coursesHistory: true,
  campsHistory: true,
  successes: true,
  failures: true,
  supervisorFirstName: true,
  supervisorSecondName: true,
  supervisorSurname: true,
  supervisorInstructorRank: true,
  supervisorInstructorFunction: true,
} satisfies Prisma.InstructorApplicationSelect;

const INSTRUCTOR_APPLICATION_UPDATE_SELECT = {
  uuid: true,
  status: true,
  updatedAt: true,
  ...INSTRUCTOR_APPLICATION_AUDIT_SELECT,
} satisfies Prisma.InstructorApplicationSelect;

const REVISION_REQUEST_ACTIVITY_SELECT = {
  uuid: true,
  candidateFirstViewedAt: true,
  candidateFirstEditedAt: true,
  candidateLastActivityAt: true,
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

type InstructorApplicationAuditSnapshot =
  Prisma.InstructorApplicationGetPayload<{
    select: typeof INSTRUCTOR_APPLICATION_AUDIT_SELECT;
  }>;

type RevisionRequestActivityRow = Prisma.InstructorReviewRevisionRequestGetPayload<{
  select: typeof REVISION_REQUEST_ACTIVITY_SELECT;
}>;

type InstructorApplicationAuditField =
  keyof typeof INSTRUCTOR_APPLICATION_AUDIT_SELECT;

type AuditJsonPrimitive = string | number | boolean | null;
type AuditJsonValue =
  | AuditJsonPrimitive
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue };

const INSTRUCTOR_APPLICATION_TEXT_AUDIT_FIELDS =
  new Set<InstructorApplicationAuditField>([
    'teamFunction',
    'hufiecFunction',
    'functionsHistory',
    'coursesHistory',
    'campsHistory',
    'successes',
    'failures',
    'supervisorFirstName',
    'supervisorSecondName',
    'supervisorSurname',
    'supervisorInstructorFunction',
  ]);

const INSTRUCTOR_APPLICATION_DATE_AUDIT_FIELDS =
  new Set<InstructorApplicationAuditField>([
    'plannedFinishAt',
    'openTrialDeadline',
  ]);

@Injectable()
export class InstructorApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentService: InstructorAttachmentService,
    private readonly validationService: InstructorApplicationValidationService,
    private readonly auditService: InstructorApplicationAuditService,
    private readonly storage: StorageService,
  ) {}

  // ── Profile check ─────────────────────────────────────────────────────────
  async checkProfile(
    principal: AuthPrincipal,
  ): Promise<InstructorApplicationProfileCheckResponse> {
    const user = await this.prisma.user.findUnique({
      where: { keycloakUuid: principal.sub },
    });

    if (!user) {
      return { complete: false, missingFields: ['profile'] };
    }

    const missing = this.validationService.getMissingProfileFields(user);

    return { complete: missing.length === 0, missingFields: missing };
  }

  // ── Templates ────────────────────────────────────────────────────────────
  async getActiveTemplates() {
    const templates = await this.prisma.requirementTemplate.findMany({
      where: { degreeType: 'INSTRUCTOR', status: 'ACTIVE' },
      include: { _count: { select: { definitions: true } } },
      orderBy: { degreeCode: 'asc' },
    });

    return templates.map((t) => ({
      uuid: t.uuid,
      degreeType: t.degreeType,
      degreeCode: t.degreeCode,
      version: t.version,
      name: t.name,
      description: t.description,
      definitionsCount: t._count.definitions,
    }));
  }

  // ── Create DRAFT ─────────────────────────────────────────────────────────
  async create(
    principal: AuthPrincipal,
    dto: CreateInstructorApplication,
    requestId?: string | null,
  ) {
    const user = await this.resolveUserForWrite(principal);

    const template = await this.prisma.requirementTemplate.findUnique({
      where: { uuid: dto.templateUuid },
      include: {
        definitions: {
          where: { isGroup: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!template || template.degreeType !== 'INSTRUCTOR') {
      throw new BadRequestException('Invalid instructor template');
    }

    let application: { uuid: string };
    try {
      // Duplicate check + create in a single transaction to prevent race conditions
      application = await this.prisma.$transaction(async (tx) => {
        const CLOSED_STATUSES: ApplicationStatus[] = [
          ApplicationStatus.REJECTED,
          ApplicationStatus.ARCHIVED,
        ];
        const existing = await tx.instructorApplication.findFirst({
          where: {
            candidateUuid: user.uuid,
            template: { degreeCode: template.degreeCode },
            status: { notIn: CLOSED_STATUSES },
          },
        });
        if (existing) {
          throw new ConflictException({
            code: 'APPLICATION_ALREADY_EXISTS',
            message: `Masz już aktywny wniosek na stopień ${template.degreeCode}.`,
            existingUuid: existing.uuid,
          });
        }

        return tx.instructorApplication.create({
          select: { uuid: true },
          data: {
            candidateUuid: user.uuid,
            templateUuid: template.uuid,
            status: ApplicationStatus.DRAFT,
            requirements: {
              create: template.definitions.map((def) => ({
                requirementDefinitionUuid: def.uuid,
                state: RequirementState.PLANNED,
                actionDescription: '',
                verificationText: '',
              })),
            },
          },
        });
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (this.isActiveDegreeGuardConflict(error)) {
        const existingUuid = await this.findActiveApplicationUuidByDegreeCode(
          user.uuid,
          template.degreeCode,
        );
        throw new ConflictException({
          code: 'APPLICATION_ALREADY_EXISTS',
          message: `Masz już aktywny wniosek na stopień ${template.degreeCode}.`,
          existingUuid,
        });
      }

      throw error;
    }

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_APPLICATION_CREATED',
      targetType: 'INSTRUCTOR_APPLICATION',
      targetUuid: application.uuid,
      requestId,
      metadata: {
        templateUuid: template.uuid,
        degreeCode: template.degreeCode,
      },
    });

    return { uuid: application.uuid };
  }

  // ── List my applications ─────────────────────────────────────────────────
  async listMy(principal: AuthPrincipal) {
    const apps = await this.prisma.instructorApplication.findMany({
      where: { candidate: { keycloakUuid: principal.sub } },
      include: { template: { select: { name: true, degreeCode: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return apps.map((a) => ({
      uuid: a.uuid,
      status: a.status,
      templateName: a.template.name,
      degreeCode: a.template.degreeCode,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      lastSubmittedAt: a.lastSubmittedAt?.toISOString() ?? null,
    }));
  }

  // ── Get detail ───────────────────────────────────────────────────────────
  async getDetail(principal: AuthPrincipal, applicationId: string) {
    const app = await this.prisma.instructorApplication.findUnique({
      where: { uuid: applicationId },
      include: {
        candidate: {
          select: {
            keycloakUuid: true,
            firstName: true,
            surname: true,
            email: true,
            phone: true,
            birthDate: true,
            hufiecCode: true,
            druzynaCode: true,
            scoutRank: true,
            scoutRankAwardedAt: true,
            instructorRank: true,
            instructorRankAwardedAt: true,
            inScoutingSince: true,
            inZhrSince: true,
            oathDate: true,
            hufiec: { select: { name: true } },
            druzyna: { select: { name: true } },
          },
        },
        template: {
          select: {
            uuid: true,
            degreeCode: true,
            name: true,
            version: true,
            definitions: {
              where: { isGroup: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                uuid: true,
                code: true,
                description: true,
                sortOrder: true,
                parentId: true,
              },
            },
          },
        },
        requirements: {
          select: {
            uuid: true,
            requirementDefinitionUuid: true,
            state: true,
            actionDescription: true,
            verificationText: true,
            requirementDefinition: {
              select: {
                uuid: true,
                code: true,
                description: true,
                isGroup: true,
                sortOrder: true,
                parentId: true,
              },
            },
            attachments: {
              where: { status: 'ACTIVE' },
              orderBy: { uploadedAt: 'desc' },
              select: {
                uuid: true,
                originalFilename: true,
                contentType: true,
                sizeBytes: true,
                uploadedAt: true,
              },
            },
          },
          orderBy: { requirementDefinition: { sortOrder: 'asc' } },
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            uuid: true,
            originalFilename: true,
            contentType: true,
            sizeBytes: true,
            uploadedAt: true,
            status: true,
            instructorRequirementUuid: true,
          },
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
      },
    });

    if (!app) throw new NotFoundException('Application not found');
    if (app.candidate.keycloakUuid !== principal.sub)
      throw new ForbiddenException();

    const attachmentRequirementByUuid = buildAttachmentRequirementMap(
      app.attachments,
    );
    const candidateEditScope = buildInstructorApplicationCandidateEditScope(
      app.status,
      app.reviewRevisionRequests[0] ?? null,
      app.fixRequests[0] ?? null,
      attachmentRequirementByUuid,
      app.hufcowyPresenceAttachmentUuid ?? null,
    );

    return {
      uuid: app.uuid,
      status: app.status,
      plannedFinishAt: app.plannedFinishAt?.toISOString().split('T')[0] ?? null,
      teamFunction: app.teamFunction,
      hufiecFunction: app.hufiecFunction,
      openTrialForRank: app.openTrialForRank,
      openTrialDeadline:
        app.openTrialDeadline?.toISOString().split('T')[0] ?? null,
      hufcowyPresence: app.hufcowyPresence,
      hufcowyPresenceAttachmentUuid: app.hufcowyPresenceAttachmentUuid ?? null,
      functionsHistory: app.functionsHistory,
      coursesHistory: app.coursesHistory,
      campsHistory: app.campsHistory,
      successes: app.successes,
      failures: app.failures,
      supervisorFirstName: app.supervisorFirstName,
      supervisorSecondName: app.supervisorSecondName,
      supervisorSurname: app.supervisorSurname,
      supervisorInstructorRank: app.supervisorInstructorRank,
      supervisorInstructorFunction: app.supervisorInstructorFunction,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      lastSubmittedAt: app.lastSubmittedAt?.toISOString() ?? null,
      template: {
        uuid: app.template.uuid,
        degreeCode: app.template.degreeCode,
        name: app.template.name,
        version: app.template.version,
        groupDefinitions: app.template.definitions.map((d) => ({
          uuid: d.uuid,
          code: d.code,
          description: d.description,
          sortOrder: d.sortOrder,
          parentId: d.parentId,
        })),
      },
      candidateProfile: {
        firstName: app.candidate.firstName,
        surname: app.candidate.surname,
        email: app.candidate.email,
        phone: app.candidate.phone,
        birthDate: app.candidate.birthDate?.toISOString().split('T')[0] ?? null,
        hufiecCode: app.candidate.hufiecCode,
        hufiecName: app.candidate.hufiec?.name ?? null,
        druzynaCode: app.candidate.druzynaCode,
        druzynaName: app.candidate.druzyna?.name ?? null,
        scoutRank: app.candidate.scoutRank,
        scoutRankAwardedAt:
          app.candidate.scoutRankAwardedAt?.toISOString().split('T')[0] ?? null,
        instructorRank: app.candidate.instructorRank,
        instructorRankAwardedAt:
          app.candidate.instructorRankAwardedAt?.toISOString().split('T')[0] ??
          null,
        inScoutingSince:
          app.candidate.inScoutingSince?.toISOString().split('T')[0] ?? null,
        inZhrSince:
          app.candidate.inZhrSince?.toISOString().split('T')[0] ?? null,
        oathDate: app.candidate.oathDate?.toISOString().split('T')[0] ?? null,
      },
      candidateEditScope,
      requirements: app.requirements.map((r) => ({
        uuid: r.uuid,
        requirementDefinitionUuid: r.requirementDefinitionUuid,
        state: r.state,
        actionDescription: r.actionDescription,
        verificationText: r.verificationText,
        definition: {
          uuid: r.requirementDefinition.uuid,
          code: r.requirementDefinition.code,
          description: r.requirementDefinition.description,
          isGroup: r.requirementDefinition.isGroup,
          sortOrder: r.requirementDefinition.sortOrder,
          parentId: r.requirementDefinition.parentId,
        },
        attachments: r.attachments.map((a) => ({
          uuid: a.uuid,
          originalFilename: a.originalFilename,
          contentType: a.contentType,
          sizeBytes: Number(a.sizeBytes),
          uploadedAt: a.uploadedAt.toISOString(),
        })),
      })),
      attachments: app.attachments
        .filter(
          (attachment) =>
            attachment.status === 'ACTIVE' &&
            attachment.instructorRequirementUuid === null,
        )
        .map((a) => ({
          uuid: a.uuid,
          originalFilename: a.originalFilename,
          contentType: a.contentType,
          sizeBytes: Number(a.sizeBytes),
          uploadedAt: a.uploadedAt.toISOString(),
        })),
    };
  }

  async markActiveRevisionRequestViewed(
    principal: AuthPrincipal,
    applicationId: string,
    _requestId?: string | null,
  ): Promise<InstructorApplicationCandidateRevisionActivityResponse> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationId);

      const app = await tx.instructorApplication.findUnique({
        where: { uuid: applicationId },
        select: {
          uuid: true,
          candidate: {
            select: {
              keycloakUuid: true,
            },
          },
        },
      });

      if (!app) {
        throw new NotFoundException('Application not found');
      }
      if (app.candidate.keycloakUuid !== principal.sub) {
        throw new ForbiddenException();
      }

      return this.markCandidateRevisionRequestViewed(tx, applicationId);
    });
  }

  // ── Update draft ─────────────────────────────────────────────────────────
  async update(
    principal: AuthPrincipal,
    applicationId: string,
    dto: UpdateInstructorApplication,
    requestId?: string | null,
  ) {
    const { beforeAuditSnapshot, updated } = await this.prisma.$transaction(
      async (tx) => {
        await this.lockApplicationRow(tx, applicationId);

        const ownedApp = await tx.instructorApplication.findUnique({
          where: { uuid: applicationId },
          select: {
            uuid: true,
            status: true,
            candidate: {
              select: {
                keycloakUuid: true,
              },
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
            hufcowyPresenceAttachmentUuid: true,
            attachments: {
              select: {
                uuid: true,
                instructorRequirementUuid: true,
              },
            },
          },
        });
        if (!ownedApp) {
          throw new NotFoundException('Application not found');
        }
        if (ownedApp.candidate.keycloakUuid !== principal.sub) {
          throw new ForbiddenException();
        }
        if (!isInstructorApplicationEditable(ownedApp.status)) {
          throw new BadRequestException({
            code: 'APPLICATION_NOT_EDITABLE',
            message: 'Application is not editable',
          });
        }
        this.ensureApplicationFieldUpdatesAllowed(
          ownedApp.status,
          ownedApp.reviewRevisionRequests[0] ?? null,
          ownedApp.fixRequests[0] ?? null,
          dto,
          buildAttachmentRequirementMap(ownedApp.attachments),
          ownedApp.hufcowyPresenceAttachmentUuid ?? null,
        );

        const beforeAuditSnapshot = await tx.instructorApplication.findUnique({
          where: { uuid: ownedApp.uuid },
          select: INSTRUCTOR_APPLICATION_AUDIT_SELECT,
        });
        if (!beforeAuditSnapshot) {
          throw new NotFoundException('Application not found');
        }

        const updated = await tx.instructorApplication.update({
          where: { uuid: ownedApp.uuid },
          select: INSTRUCTOR_APPLICATION_UPDATE_SELECT,
          data: {
            ...(dto.plannedFinishAt !== undefined && {
              plannedFinishAt: dto.plannedFinishAt
                ? new Date(dto.plannedFinishAt)
                : null,
            }),
            ...(dto.teamFunction !== undefined && {
              teamFunction: dto.teamFunction,
            }),
            ...(dto.hufiecFunction !== undefined && {
              hufiecFunction: dto.hufiecFunction,
            }),
            ...(dto.openTrialForRank !== undefined && {
              openTrialForRank: dto.openTrialForRank,
            }),
            ...(dto.openTrialDeadline !== undefined && {
              openTrialDeadline: dto.openTrialDeadline
                ? new Date(dto.openTrialDeadline)
                : null,
            }),
            ...(dto.hufcowyPresence !== undefined && {
              hufcowyPresence: dto.hufcowyPresence,
              ...(dto.hufcowyPresence !== 'ATTACHMENT_OPINION' && {
                hufcowyPresenceAttachmentUuid: null,
              }),
            }),
            ...(dto.functionsHistory !== undefined && {
              functionsHistory: dto.functionsHistory,
            }),
            ...(dto.coursesHistory !== undefined && {
              coursesHistory: dto.coursesHistory,
            }),
            ...(dto.campsHistory !== undefined && {
              campsHistory: dto.campsHistory,
            }),
            ...(dto.successes !== undefined && { successes: dto.successes }),
            ...(dto.failures !== undefined && { failures: dto.failures }),
            ...(dto.supervisorFirstName !== undefined && {
              supervisorFirstName: dto.supervisorFirstName,
            }),
            ...(dto.supervisorSecondName !== undefined && {
              supervisorSecondName: dto.supervisorSecondName,
            }),
            ...(dto.supervisorSurname !== undefined && {
              supervisorSurname: dto.supervisorSurname,
            }),
            ...(dto.supervisorInstructorRank !== undefined && {
              supervisorInstructorRank: dto.supervisorInstructorRank,
            }),
            ...(dto.supervisorInstructorFunction !== undefined && {
              supervisorInstructorFunction: dto.supervisorInstructorFunction,
            }),
          },
        });

        await this.markCandidateRevisionRequestEdited(
          tx,
          ownedApp.uuid,
          ownedApp.reviewRevisionRequests[0] ?? null,
        );

        return { beforeAuditSnapshot, updated };
      },
    );
    const fieldChanges = this.buildApplicationFieldChanges(
      beforeAuditSnapshot,
      updated,
    );
    const changedFields = Object.keys(fieldChanges);

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_APPLICATION_UPDATED',
      targetType: 'INSTRUCTOR_APPLICATION',
      targetUuid: updated.uuid,
      requestId,
      metadata: {
        applicationId: updated.uuid,
        changedFields,
        fieldChanges,
      },
    });

    return {
      uuid: updated.uuid,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async submit(
    principal: AuthPrincipal,
    applicationId: string,
    requestId?: string | null,
  ) {
    const submittedApplication = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationId);

      // All checks inside transaction to prevent TOCTOU race conditions
      const fullApp = await tx.instructorApplication.findUnique({
        where: { uuid: applicationId },
        include: {
          candidate: true,
          template: true,
          requirements: { include: { requirementDefinition: true } },
          attachments: { where: { status: 'ACTIVE' } },
        },
      });
      if (!fullApp) throw new NotFoundException('Application not found');
      if (fullApp.candidate.keycloakUuid !== principal.sub)
        throw new ForbiddenException();
      if (!isInstructorApplicationEditable(fullApp.status)) {
        throw new BadRequestException({
          code: 'APPLICATION_NOT_EDITABLE',
          message: 'Application is not editable',
        });
      }

      this.ensureCompleteProfileForWrite(fullApp.candidate);

      // Validate required fields before submit
      this.validationService.validateRequiredFieldsForSubmit(fullApp);

      const publishedRevisionRequest =
        await tx.instructorReviewRevisionRequest.findFirst({
          where: {
            applicationUuid: fullApp.uuid,
            status: InstructorReviewRevisionRequestStatus.PUBLISHED,
          },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          select: {
            uuid: true,
          },
        });

      // Count existing snapshots inside transaction
      const latestSnapshot = await tx.instructorApplicationSnapshot.findFirst({
        where: { applicationUuid: applicationId },
        orderBy: {
          revision: 'desc',
        },
        select: {
          revision: true,
        },
      });
      const nextRevision = (latestSnapshot?.revision ?? 0) + 1;
      const submittedAt = new Date();

      // Create snapshot
      const submittedSnapshot = await tx.instructorApplicationSnapshot.create({
        select: {
          uuid: true,
          revision: true,
        },
        data: {
          applicationUuid: fullApp.uuid,
          revision: nextRevision,
          templateUuid: fullApp.template.uuid,
          templateVersion: fullApp.template.version,
          candidateSnapshot: {
            uuid: fullApp.candidate.uuid,
            firstName: fullApp.candidate.firstName,
            surname: fullApp.candidate.surname,
            email: fullApp.candidate.email,
            hufiecCode: fullApp.candidate.hufiecCode,
            druzynaCode: fullApp.candidate.druzynaCode,
            scoutRank: fullApp.candidate.scoutRank,
            instructorRank: fullApp.candidate.instructorRank,
          },
          requirementsSnapshot: fullApp.requirements.map((r) => ({
            uuid: r.uuid,
            code: r.requirementDefinition.code,
            description: r.requirementDefinition.description,
            state: r.state,
            actionDescription: r.actionDescription,
            verificationText: r.verificationText,
          })),
          attachmentsMetadata: fullApp.attachments.map((a) => ({
            uuid: a.uuid,
            objectKey: a.objectKey,
            originalFilename: a.originalFilename,
            contentType: a.contentType,
            sizeBytes: Number(a.sizeBytes),
            checksum: a.checksum ?? null,
            checksumAlgorithm: a.checksumAlgorithm ?? null,
            instructorRequirementUuid: a.instructorRequirementUuid ?? null,
            isHufcowyPresence: fullApp.hufcowyPresenceAttachmentUuid === a.uuid,
          })),
          applicationDataSnapshot: {
            plannedFinishAt:
              fullApp.plannedFinishAt?.toISOString().split('T')[0] ?? null,
            teamFunction: fullApp.teamFunction,
            hufiecFunction: fullApp.hufiecFunction,
            openTrialForRank: fullApp.openTrialForRank,
            openTrialDeadline:
              fullApp.openTrialDeadline?.toISOString().split('T')[0] ?? null,
            hufcowyPresence: fullApp.hufcowyPresence,
            functionsHistory: fullApp.functionsHistory,
            coursesHistory: fullApp.coursesHistory,
            campsHistory: fullApp.campsHistory,
            successes: fullApp.successes,
            failures: fullApp.failures,
            supervisorFirstName: fullApp.supervisorFirstName,
            supervisorSecondName: fullApp.supervisorSecondName,
            supervisorSurname: fullApp.supervisorSurname,
            supervisorInstructorRank: fullApp.supervisorInstructorRank,
            supervisorInstructorFunction: fullApp.supervisorInstructorFunction,
          },
          candidateFirstName: fullApp.candidate.firstName ?? '',
          candidateSurname: fullApp.candidate.surname ?? '',
          candidateEmailAtSubmit: fullApp.candidate.email ?? '',
          hufiecCodeAtSubmit: fullApp.candidate.hufiecCode,
          druzynaCodeAtSubmit: fullApp.candidate.druzynaCode,
          statusAtSubmit: ApplicationStatus.SUBMITTED,
        },
      });

      let resolvedRevisionRequestCount = 0;

      if (publishedRevisionRequest) {
        await tx.instructorReviewRevisionRequest.update({
          where: {
            uuid: publishedRevisionRequest.uuid,
          },
          data: {
            status: InstructorReviewRevisionRequestStatus.RESOLVED,
            resolvedAt: submittedAt,
            resolvedByUuid: fullApp.candidate.uuid,
            updatedByUuid: fullApp.candidate.uuid,
            responseSnapshotUuid: submittedSnapshot.uuid,
          },
        });
        resolvedRevisionRequestCount = 1;
      }

      await tx.instructorReviewCandidateAnnotation.updateMany({
        where: {
          revisionRequest: {
            applicationUuid: fullApp.uuid,
            status: InstructorReviewRevisionRequestStatus.RESOLVED,
          },
          status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
        },
        data: {
          status: InstructorReviewCandidateAnnotationStatus.RESOLVED,
          resolvedAt: submittedAt,
          resolvedByUuid: fullApp.candidate.uuid,
          updatedByUuid: fullApp.candidate.uuid,
        },
      });

      // Update application status
      const updatedApplication = await tx.instructorApplication.update({
        where: { uuid: fullApp.uuid },
        select: {
          uuid: true,
          status: true,
          lastSubmittedAt: true,
        },
        data: {
          status: ApplicationStatus.SUBMITTED,
          lastSubmittedAt: submittedAt,
        },
      });

      return {
        ...updatedApplication,
        resolvedRevisionRequestCount,
      };
    });

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_APPLICATION_SUBMITTED',
      targetType: 'INSTRUCTOR_APPLICATION',
      targetUuid: submittedApplication.uuid,
      requestId,
      metadata: {
        status: submittedApplication.status,
        resolvedRevisionRequestCount:
          submittedApplication.resolvedRevisionRequestCount,
      },
    });

    return {
      uuid: submittedApplication.uuid,
      status: submittedApplication.status,
      lastSubmittedAt:
        submittedApplication.lastSubmittedAt?.toISOString() ?? null,
    };
  }

  // ── Delete draft ─────────────────────────────────────────────────────────
  async deleteDraft(
    principal: AuthPrincipal,
    applicationId: string,
    requestId?: string | null,
  ) {
    const {
      deletedApplicationUuid,
      deletedAttachmentKeys,
      deletedAttachmentCount,
    } = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationId);

      const ownedApp = await tx.instructorApplication.findUnique({
        where: { uuid: applicationId },
        select: {
          uuid: true,
          status: true,
          candidate: {
            select: {
              keycloakUuid: true,
            },
          },
          attachments: {
            select: {
              objectKey: true,
            },
          },
        },
      });
      if (!ownedApp) {
        throw new NotFoundException('Application not found');
      }
      if (ownedApp.candidate.keycloakUuid !== principal.sub) {
        throw new ForbiddenException();
      }
      if (ownedApp.status !== ApplicationStatus.DRAFT) {
        throw new BadRequestException({
          code: 'APPLICATION_NOT_DRAFT',
          message: 'Only draft applications can be deleted',
        });
      }

      await tx.meetingRegistration.deleteMany({
        where: { instructorApplicationUuid: ownedApp.uuid },
      });

      const deletedAttachments = await tx.attachment.deleteMany({
        where: { instructorApplicationUuid: ownedApp.uuid },
      });

      await tx.instructorApplication.delete({
        where: { uuid: ownedApp.uuid },
      });

      return {
        deletedApplicationUuid: ownedApp.uuid,
        deletedAttachmentKeys: ownedApp.attachments.map(
          (attachment) => attachment.objectKey,
        ),
        deletedAttachmentCount: deletedAttachments.count,
      };
    });

    let failedStorageDeleteCount = 0;
    for (const objectKey of deletedAttachmentKeys) {
      try {
        await this.storage.deleteObject(objectKey);
      } catch {
        // DB is already cleaned. If storage deletion fails, nightly orphan cleanup will retry.
        failedStorageDeleteCount += 1;
      }
    }

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_APPLICATION_DELETED',
      targetType: 'INSTRUCTOR_APPLICATION',
      targetUuid: deletedApplicationUuid,
      requestId,
      metadata: {
        deletedAttachmentCount,
        failedStorageDeleteCount,
      },
    });

    return { uuid: deletedApplicationUuid };
  }

  // ── Update requirement ───────────────────────────────────────────────────
  async updateRequirement(
    principal: AuthPrincipal,
    applicationId: string,
    requirementId: string,
    dto: UpdateInstructorRequirement,
    requestId?: string | null,
  ) {
    const { req, updatedRequirement } = await this.prisma.$transaction(
      async (tx) => {
        await this.lockApplicationRow(tx, applicationId);

        const ownedApp = await tx.instructorApplication.findUnique({
          where: { uuid: applicationId },
          select: {
            status: true,
            template: {
              select: {
                degreeCode: true,
              },
            },
            candidate: {
              select: {
                keycloakUuid: true,
              },
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
            hufcowyPresenceAttachmentUuid: true,
            attachments: {
              select: {
                uuid: true,
                instructorRequirementUuid: true,
              },
            },
          },
        });
        if (!ownedApp) {
          throw new NotFoundException('Application not found');
        }
        if (ownedApp.candidate.keycloakUuid !== principal.sub) {
          throw new ForbiddenException();
        }
        if (!isInstructorApplicationEditable(ownedApp.status)) {
          throw new BadRequestException({
            code: 'APPLICATION_NOT_EDITABLE',
            message: 'Application is not editable',
          });
        }
        this.ensureRequirementUpdateAllowed(
          ownedApp.status,
          ownedApp.reviewRevisionRequests[0] ?? null,
          ownedApp.fixRequests[0] ?? null,
          requirementId,
          buildAttachmentRequirementMap(ownedApp.attachments),
          ownedApp.hufcowyPresenceAttachmentUuid ?? null,
        );

        const req = await tx.instructorApplicationRequirement.findUnique({
          where: { uuid: requirementId },
          select: {
            uuid: true,
            applicationUuid: true,
            state: true,
            actionDescription: true,
            verificationText: true,
            requirementDefinition: {
              select: {
                code: true,
              },
            },
          },
        });
        if (!req || req.applicationUuid !== applicationId) {
          throw new NotFoundException('Requirement not found');
        }

        const actionDescription = dto.actionDescription.trim();
        const verificationText = dto.verificationText.trim();
        const isOptionalRequirement = isOptionalInstructorRequirement(
          ownedApp.template.degreeCode,
          req.requirementDefinition.code,
        );

        if (!isOptionalRequirement && actionDescription.length === 0) {
          throw new BadRequestException(
            'Opis realizacji zadania jest wymagany.',
          );
        }

        if (!isOptionalRequirement && verificationText.length === 0) {
          throw new BadRequestException('Opis załącznika jest wymagany.');
        }

        const updatedRequirement =
          await tx.instructorApplicationRequirement.update({
            where: { uuid: requirementId },
            select: {
              uuid: true,
              state: true,
              actionDescription: true,
              verificationText: true,
              requirementDefinition: {
                select: {
                  code: true,
                },
              },
            },
            data: {
              state: dto.state as RequirementState,
              actionDescription,
              verificationText,
            },
          });

        await this.markCandidateRevisionRequestEdited(
          tx,
          applicationId,
          ownedApp.reviewRevisionRequests[0] ?? null,
        );

        return { req, updatedRequirement };
      },
    );

    await this.auditService.log({
      principal,
      action: 'INSTRUCTOR_REQUIREMENT_UPDATED',
      targetType: 'INSTRUCTOR_REQUIREMENT',
      targetUuid: updatedRequirement.uuid,
      requestId,
      metadata: {
        applicationId,
        requirementCode: updatedRequirement.requirementDefinition.code,
        state: {
          from: req.state,
          to: updatedRequirement.state,
        },
        actionDescription: this.buildTextAuditChange(
          req.actionDescription,
          updatedRequirement.actionDescription,
        ),
        verificationText: this.buildTextAuditChange(
          req.verificationText,
          updatedRequirement.verificationText,
        ),
      },
    });

    return {
      uuid: updatedRequirement.uuid,
      state: updatedRequirement.state,
      actionDescription: updatedRequirement.actionDescription,
      verificationText: updatedRequirement.verificationText,
    };
  }

  // ── Presign upload ───────────────────────────────────────────────────────
  async presignAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: PresignUploadRequest,
    requestId?: string | null,
  ) {
    return this.attachmentService.presignAttachment(
      principal,
      applicationId,
      dto,
      requestId,
    );
  }

  // ── Confirm upload ───────────────────────────────────────────────────────
  async confirmAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: ConfirmUploadRequest,
    requestId?: string | null,
  ) {
    return this.attachmentService.confirmAttachment(
      principal,
      applicationId,
      dto,
      requestId,
    );
  }

  // ── Delete attachment ────────────────────────────────────────────────────
  async deleteAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
    requestId?: string | null,
  ) {
    return this.attachmentService.deleteAttachment(
      principal,
      applicationId,
      attachmentId,
      requestId,
    );
  }

  // ── Download attachment ─────────────────────────────────────────────────
  async getAttachmentDownloadUrl(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
    inline = false,
    requestId?: string | null,
  ) {
    return this.attachmentService.getAttachmentDownloadUrl(
      principal,
      applicationId,
      attachmentId,
      inline,
      requestId,
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  /** Find user — for read operations (list, detail). */
  private async resolveUser(principal: AuthPrincipal) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakUuid: principal.sub },
      include: {
        hufiec: { select: { name: true } },
        druzyna: { select: { name: true } },
      },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'PROFILE_REQUIRED',
        message: 'Profil nie istnieje. Uzupełnij go w Dashboard.',
      });
    }
    return user;
  }

  /** Find user + enforce complete profile — for write operations (create). */
  private async resolveUserForWrite(principal: AuthPrincipal) {
    const user = await this.resolveUser(principal);

    this.ensureCompleteProfileForWrite(user);

    return user;
  }

  private ensureCompleteProfileForWrite(
    user: Parameters<
      InstructorApplicationValidationService['ensureProfileCompleteForWrite']
    >[0],
  ) {
    this.validationService.ensureProfileCompleteForWrite(user);
  }

  private buildApplicationFieldChanges(
    before: InstructorApplicationAuditSnapshot,
    after: InstructorApplicationAuditSnapshot,
  ): Record<string, AuditJsonValue> {
    const changes: Record<string, AuditJsonValue> = {};

    for (const field of Object.keys(
      INSTRUCTOR_APPLICATION_AUDIT_SELECT,
    ) as InstructorApplicationAuditField[]) {
      if (INSTRUCTOR_APPLICATION_DATE_AUDIT_FIELDS.has(field)) {
        const beforeDate = this.toIsoDate(
          before[field] as Date | null | undefined,
        );
        const afterDate = this.toIsoDate(
          after[field] as Date | null | undefined,
        );
        if (beforeDate !== afterDate) {
          changes[field] = {
            from: beforeDate,
            to: afterDate,
          };
        }
        continue;
      }

      if (INSTRUCTOR_APPLICATION_TEXT_AUDIT_FIELDS.has(field)) {
        const beforeText = before[field] as string | null;
        const afterText = after[field] as string | null;
        if (beforeText !== afterText) {
          changes[field] = this.buildTextAuditChange(beforeText, afterText);
        }
        continue;
      }

      const beforeValue = before[field] as string | null;
      const afterValue = after[field] as string | null;
      if (beforeValue !== afterValue) {
        changes[field] = {
          from: beforeValue,
          to: afterValue,
        };
      }
    }

    return changes;
  }

  private toCandidateRevisionActivityDto(
    revisionRequest: RevisionRequestActivityRow | null,
  ): InstructorApplicationCandidateRevisionActivityResponse {
    if (!revisionRequest) {
      return {
        requestUuid: null,
        candidateFirstViewedAt: null,
        candidateFirstEditedAt: null,
        candidateLastActivityAt: null,
      };
    }

    return {
      requestUuid: revisionRequest.uuid,
      candidateFirstViewedAt:
        revisionRequest.candidateFirstViewedAt?.toISOString() ?? null,
      candidateFirstEditedAt:
        revisionRequest.candidateFirstEditedAt?.toISOString() ?? null,
      candidateLastActivityAt:
        revisionRequest.candidateLastActivityAt?.toISOString() ?? null,
    };
  }

  private async findPublishedRevisionRequestActivity(
    tx: Prisma.TransactionClient,
    applicationId: string,
  ): Promise<RevisionRequestActivityRow | null> {
    return tx.instructorReviewRevisionRequest.findFirst({
      where: {
        applicationUuid: applicationId,
        status: InstructorReviewRevisionRequestStatus.PUBLISHED,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: REVISION_REQUEST_ACTIVITY_SELECT,
    });
  }

  private async markCandidateRevisionRequestViewed(
    tx: Prisma.TransactionClient,
    applicationId: string,
  ): Promise<InstructorApplicationCandidateRevisionActivityResponse> {
    const publishedRevisionRequest = await this.findPublishedRevisionRequestActivity(
      tx,
      applicationId,
    );

    if (!publishedRevisionRequest) {
      return this.toCandidateRevisionActivityDto(null);
    }

    if (publishedRevisionRequest.candidateFirstViewedAt) {
      return this.toCandidateRevisionActivityDto(publishedRevisionRequest);
    }

    const now = new Date();
    const updatedRevisionRequest = await tx.instructorReviewRevisionRequest.update({
      where: { uuid: publishedRevisionRequest.uuid },
      data: {
        candidateFirstViewedAt: now,
        candidateLastActivityAt: now,
      },
      select: REVISION_REQUEST_ACTIVITY_SELECT,
    });

    return this.toCandidateRevisionActivityDto(updatedRevisionRequest);
  }

  private async markCandidateRevisionRequestEdited(
    tx: Prisma.TransactionClient,
    applicationId: string,
    publishedRevisionRequest:
      | PublishedRevisionRequestScopeRow
      | null
      | undefined = null,
  ): Promise<void> {
    const request =
      publishedRevisionRequest ??
      (await this.findPublishedRevisionRequestActivity(tx, applicationId));

    if (!request) {
      return;
    }

    const now = new Date();
    await tx.instructorReviewRevisionRequest.update({
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

  private ensureApplicationFieldUpdatesAllowed(
    status: ApplicationStatus,
    publishedRevisionRequest: PublishedRevisionRequestScopeRow | null,
    legacyPublishedFixRequest: PublishedFixRequestScopeRow | null,
    dto: UpdateInstructorApplication,
    attachmentRequirementByUuid: ReadonlyMap<string, string | null> = new Map(),
    hufcowyPresenceAttachmentUuid: string | null = null,
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
    const requestedFields = Object.keys(
      dto,
    ) as EditableInstructorApplicationField[];
    const disallowedFields = requestedFields.filter(
      (field) => !canEditInstructorApplicationField(scope, field),
    );

    if (disallowedFields.length === 0) {
      return;
    }

    throw new ForbiddenException({
      code: 'FIELD_UPDATE_NOT_ALLOWED',
      message: 'Możesz edytować tylko pola wyraźnie odblokowane przez komisję.',
      details: {
        fields: disallowedFields,
      },
    });
  }

  private ensureRequirementUpdateAllowed(
    status: ApplicationStatus,
    publishedRevisionRequest: PublishedRevisionRequestScopeRow | null,
    legacyPublishedFixRequest: PublishedFixRequestScopeRow | null,
    requirementUuid: string,
    attachmentRequirementByUuid: ReadonlyMap<string, string | null> = new Map(),
    hufcowyPresenceAttachmentUuid: string | null = null,
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

    if (canEditInstructorRequirement(scope, requirementUuid)) {
      return;
    }

    throw new ForbiddenException({
      code: 'REQUIREMENT_UPDATE_NOT_ALLOWED',
      message:
        'Możesz edytować tylko treść zadań wyraźnie odblokowanych przez komisję.',
      details: {
        requirementUuid,
      },
    });
  }

  private buildTextAuditChange(before: string | null, after: string | null) {
    return {
      from: this.describeTextValue(before),
      to: this.describeTextValue(after),
    };
  }

  private describeTextValue(value: string | null) {
    const normalized = value?.trim() ?? '';
    return {
      length: normalized.length,
      isBlank: normalized.length === 0,
      digest:
        normalized.length > 0
          ? createHash('sha256').update(normalized).digest('hex').slice(0, 16)
          : null,
    };
  }

  private toIsoDate(value: Date | null | undefined): string | null {
    if (!value) {
      return null;
    }
    return value.toISOString().split('T')[0] ?? null;
  }

  private isActiveDegreeGuardConflict(error: unknown): boolean {
    const details =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `${error.message} ${JSON.stringify(error.meta ?? {})}`
        : String(error);
    return details.includes('InstructorApplication_active_degree_unique');
  }

  private async findActiveApplicationUuidByDegreeCode(
    candidateUuid: string,
    degreeCode: string,
  ): Promise<string | null> {
    const existing = await this.prisma.instructorApplication.findFirst({
      where: {
        candidateUuid,
        template: { degreeCode },
        status: {
          notIn: [ApplicationStatus.REJECTED, ApplicationStatus.ARCHIVED],
        },
      },
      select: { uuid: true },
      orderBy: { updatedAt: 'desc' },
    });
    return existing?.uuid ?? null;
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
}
