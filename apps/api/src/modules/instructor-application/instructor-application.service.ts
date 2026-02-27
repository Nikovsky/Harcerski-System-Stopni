// @file: apps/api/src/modules/instructor-application/instructor-application.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { ApplicationStatus, RequirementState } from '@hss/database';
import { InstructorAttachmentService } from '@/modules/instructor-application/instructor-attachment.service';
import { InstructorApplicationValidationService } from '@/modules/instructor-application/instructor-application-validation.service';
import type { AuthPrincipal } from '@hss/schemas';
import { isInstructorApplicationEditable } from '@hss/schemas';
import type {
  CreateInstructorApplication,
  UpdateInstructorApplication,
  UpdateInstructorRequirement,
  PresignUploadRequest,
  ConfirmUploadRequest,
} from '@hss/schemas';

@Injectable()
export class InstructorApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentService: InstructorAttachmentService,
    private readonly validationService: InstructorApplicationValidationService,
  ) {}

  // ── Profile check ─────────────────────────────────────────────────────────
  async checkProfile(principal: AuthPrincipal) {
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
  async create(principal: AuthPrincipal, dto: CreateInstructorApplication) {
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

    // Duplicate check + create in a single transaction to prevent race conditions
    const application = await this.prisma.$transaction(async (tx) => {
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
        data: {
          candidateUuid: user.uuid,
          templateUuid: template.uuid,
          status: ApplicationStatus.DRAFT,
          requirements: {
            create: template.definitions.map((def) => ({
              requirementDefinitionUuid: def.uuid,
              state: RequirementState.PLANNED,
              actionDescription: '',
            })),
          },
        },
      });
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
          where: { status: 'ACTIVE', instructorRequirementUuid: null },
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
    });

    if (!app) throw new NotFoundException('Application not found');
    if (app.candidate.keycloakUuid !== principal.sub)
      throw new ForbiddenException();

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
      attachments: app.attachments.map((a) => ({
        uuid: a.uuid,
        originalFilename: a.originalFilename,
        contentType: a.contentType,
        sizeBytes: Number(a.sizeBytes),
        uploadedAt: a.uploadedAt.toISOString(),
      })),
    };
  }

  // ── Update draft ─────────────────────────────────────────────────────────
  async update(
    principal: AuthPrincipal,
    applicationId: string,
    dto: UpdateInstructorApplication,
  ) {
    const app = await this.ensureOwnDraft(principal, applicationId);

    const updated = await this.prisma.instructorApplication.update({
      where: { uuid: app.uuid },
      select: {
        uuid: true,
        status: true,
        updatedAt: true,
      },
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

    return {
      uuid: updated.uuid,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async submit(principal: AuthPrincipal, applicationId: string) {
    const submittedApplication = await this.prisma.$transaction(async (tx) => {
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
        throw new BadRequestException('Application is not editable');
      }

      this.ensureCompleteProfileForWrite(fullApp.candidate);

      // Validate required fields before submit
      this.validationService.validateRequiredFieldsForSubmit(fullApp);

      // Count existing snapshots inside transaction
      const snapshotCount = await tx.instructorApplicationSnapshot.count({
        where: { applicationUuid: applicationId },
      });

      // Create snapshot
      await tx.instructorApplicationSnapshot.create({
        data: {
          applicationUuid: fullApp.uuid,
          revision: snapshotCount + 1,
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
          })),
          attachmentsMetadata: fullApp.attachments.map((a) => ({
            uuid: a.uuid,
            objectKey: a.objectKey,
            originalFilename: a.originalFilename,
            contentType: a.contentType,
            sizeBytes: Number(a.sizeBytes),
          })),
          applicationDataSnapshot: {
            plannedFinishAt: fullApp.plannedFinishAt,
            teamFunction: fullApp.teamFunction,
            hufiecFunction: fullApp.hufiecFunction,
            openTrialForRank: fullApp.openTrialForRank,
            supervisorFirstName: fullApp.supervisorFirstName,
            supervisorSurname: fullApp.supervisorSurname,
            supervisorInstructorRank: fullApp.supervisorInstructorRank,
          },
          candidateFirstName: fullApp.candidate.firstName ?? '',
          candidateSurname: fullApp.candidate.surname ?? '',
          candidateEmailAtSubmit: fullApp.candidate.email ?? '',
          hufiecCodeAtSubmit: fullApp.candidate.hufiecCode,
          druzynaCodeAtSubmit: fullApp.candidate.druzynaCode,
          statusAtSubmit: ApplicationStatus.SUBMITTED,
        },
      });

      // Update application status
      return tx.instructorApplication.update({
        where: { uuid: fullApp.uuid },
        select: {
          uuid: true,
          status: true,
          lastSubmittedAt: true,
        },
        data: {
          status: ApplicationStatus.SUBMITTED,
          lastSubmittedAt: new Date(),
        },
      });
    });

    return {
      uuid: submittedApplication.uuid,
      status: submittedApplication.status,
      lastSubmittedAt: submittedApplication.lastSubmittedAt?.toISOString() ?? null,
    };
  }

  // ── Delete draft ─────────────────────────────────────────────────────────
  async deleteDraft(principal: AuthPrincipal, applicationId: string) {
    const app = await this.ensureOwnDraft(principal, applicationId);

    await this.prisma.instructorApplication.delete({
      where: { uuid: app.uuid },
    });

    return { uuid: app.uuid };
  }

  // ── Update requirement ───────────────────────────────────────────────────
  async updateRequirement(
    principal: AuthPrincipal,
    applicationId: string,
    requirementId: string,
    dto: UpdateInstructorRequirement,
  ) {
    await this.ensureOwnDraft(principal, applicationId);

    const req = await this.prisma.instructorApplicationRequirement.findUnique({
      where: { uuid: requirementId },
    });
    if (!req || req.applicationUuid !== applicationId) {
      throw new NotFoundException('Requirement not found');
    }

    // Validate: verificationText is required when state is DONE
    if (
      dto.state === 'DONE' &&
      (!dto.verificationText || !dto.verificationText.trim())
    ) {
      throw new BadRequestException(
        'Opis załącznika jest wymagany gdy wymaganie jest oznaczone jako wykonane.',
      );
    }

    const updatedRequirement =
      await this.prisma.instructorApplicationRequirement.update({
      where: { uuid: requirementId },
      select: {
        uuid: true,
        state: true,
        actionDescription: true,
        verificationText: true,
      },
      data: {
        state: dto.state as RequirementState,
        actionDescription: dto.actionDescription,
        ...(dto.verificationText !== undefined && {
          verificationText: dto.verificationText,
        }),
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
  ) {
    return this.attachmentService.presignAttachment(
      principal,
      applicationId,
      dto,
    );
  }

  // ── Confirm upload ───────────────────────────────────────────────────────
  async confirmAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: ConfirmUploadRequest,
  ) {
    return this.attachmentService.confirmAttachment(
      principal,
      applicationId,
      dto,
    );
  }

  // ── Delete attachment ────────────────────────────────────────────────────
  async deleteAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
  ) {
    return this.attachmentService.deleteAttachment(
      principal,
      applicationId,
      attachmentId,
    );
  }

  // ── Download attachment ─────────────────────────────────────────────────
  async getAttachmentDownloadUrl(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
    inline = false,
  ) {
    return this.attachmentService.getAttachmentDownloadUrl(
      principal,
      applicationId,
      attachmentId,
      inline,
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

  private ensureCompleteProfileForWrite(user: Parameters<
    InstructorApplicationValidationService['ensureProfileCompleteForWrite']
  >[0]) {
    this.validationService.ensureProfileCompleteForWrite(user);
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
}
