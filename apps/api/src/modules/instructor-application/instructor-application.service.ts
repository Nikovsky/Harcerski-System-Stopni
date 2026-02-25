// @file: apps/api/src/modules/instructor-application/instructor-application.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";
import { PrismaService } from "@/database/prisma/prisma.service";
import { StorageService } from "@/modules/storage/storage.service";
import { ApplicationStatus, RequirementState } from "@hss/database";
import type { AuthPrincipal } from "@hss/schemas";
import type {
  CreateInstructorApplication,
  UpdateInstructorApplication,
  UpdateInstructorRequirement,
  PresignUploadRequest,
  ConfirmUploadRequest,
} from "@hss/schemas";

@Injectable()
export class InstructorApplicationService {
  private readonly logger = new Logger(InstructorApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── Profile check ─────────────────────────────────────────────────────────
  async checkProfile(principal: AuthPrincipal) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakUuid: principal.sub },
    });

    if (!user) {
      return { complete: false, missingFields: ["profile"] };
    }

    const missing: string[] = [];
    if (!user.firstName) missing.push("firstName");
    if (!user.surname) missing.push("surname");
    if (!user.email) missing.push("email");
    if (!user.phone) missing.push("phone");
    if (!user.birthDate) missing.push("birthDate");
    if (!user.hufiecCode) missing.push("hufiecCode");
    if (!user.druzynaCode) missing.push("druzynaCode");
    if (!user.scoutRank) missing.push("scoutRank");
    if (!user.inScoutingSince) missing.push("inScoutingSince");
    if (!user.inZhrSince) missing.push("inZhrSince");
    if (!user.oathDate) missing.push("oathDate");

    return { complete: missing.length === 0, missingFields: missing };
  }

  // ── Templates ────────────────────────────────────────────────────────────
  async getActiveTemplates() {
    const templates = await this.prisma.requirementTemplate.findMany({
      where: { degreeType: "INSTRUCTOR", status: "ACTIVE" },
      include: { _count: { select: { definitions: true } } },
      orderBy: { degreeCode: "asc" },
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
        definitions: { where: { isGroup: false }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!template || template.degreeType !== "INSTRUCTOR") {
      throw new BadRequestException("Invalid instructor template");
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
          code: "APPLICATION_ALREADY_EXISTS",
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
              actionDescription: "",
            })),
          },
        },
      });
    });

    return { uuid: application.uuid };
  }

  // ── List my applications ─────────────────────────────────────────────────
  async listMy(principal: AuthPrincipal) {
    const user = await this.resolveUser(principal);

    const apps = await this.prisma.instructorApplication.findMany({
      where: { candidateUuid: user.uuid },
      include: { template: { select: { name: true, degreeCode: true } } },
      orderBy: { updatedAt: "desc" },
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
    const user = await this.resolveUser(principal);
    const app = await this.prisma.instructorApplication.findUnique({
      where: { uuid: applicationId },
      include: {
        template: {
          select: {
            uuid: true,
            degreeCode: true,
            name: true,
            version: true,
            definitions: {
              where: { isGroup: true },
              orderBy: { sortOrder: "asc" },
              select: { uuid: true, code: true, description: true, sortOrder: true, parentId: true },
            },
          },
        },
        requirements: {
          include: {
            requirementDefinition: true,
            attachments: {
              where: { status: "ACTIVE" },
              orderBy: { uploadedAt: "desc" },
            },
          },
          orderBy: { requirementDefinition: { sortOrder: "asc" } },
        },
        attachments: {
          where: { status: "ACTIVE", instructorRequirementUuid: null },
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!app) throw new NotFoundException("Application not found");
    if (app.candidateUuid !== user.uuid) throw new ForbiddenException();

    return {
      uuid: app.uuid,
      status: app.status,
      plannedFinishAt: app.plannedFinishAt?.toISOString().split("T")[0] ?? null,
      teamFunction: app.teamFunction,
      hufiecFunction: app.hufiecFunction,
      openTrialForRank: app.openTrialForRank,
      openTrialDeadline: app.openTrialDeadline?.toISOString().split("T")[0] ?? null,
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
        firstName: user.firstName,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate?.toISOString().split("T")[0] ?? null,
        hufiecCode: user.hufiecCode,
        hufiecName: user.hufiec?.name ?? null,
        druzynaCode: user.druzynaCode,
        druzynaName: user.druzyna?.name ?? null,
        scoutRank: user.scoutRank,
        scoutRankAwardedAt: user.scoutRankAwardedAt?.toISOString().split("T")[0] ?? null,
        instructorRank: user.instructorRank,
        instructorRankAwardedAt: user.instructorRankAwardedAt?.toISOString().split("T")[0] ?? null,
        inScoutingSince: user.inScoutingSince?.toISOString().split("T")[0] ?? null,
        inZhrSince: user.inZhrSince?.toISOString().split("T")[0] ?? null,
        oathDate: user.oathDate?.toISOString().split("T")[0] ?? null,
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

    await this.prisma.instructorApplication.update({
      where: { uuid: app.uuid },
      data: {
        ...(dto.plannedFinishAt !== undefined && {
          plannedFinishAt: dto.plannedFinishAt ? new Date(dto.plannedFinishAt) : null,
        }),
        ...(dto.teamFunction !== undefined && { teamFunction: dto.teamFunction }),
        ...(dto.hufiecFunction !== undefined && { hufiecFunction: dto.hufiecFunction }),
        ...(dto.openTrialForRank !== undefined && { openTrialForRank: dto.openTrialForRank }),
        ...(dto.openTrialDeadline !== undefined && {
          openTrialDeadline: dto.openTrialDeadline ? new Date(dto.openTrialDeadline) : null,
        }),
        ...(dto.hufcowyPresence !== undefined && { hufcowyPresence: dto.hufcowyPresence }),
        ...(dto.functionsHistory !== undefined && { functionsHistory: dto.functionsHistory }),
        ...(dto.coursesHistory !== undefined && { coursesHistory: dto.coursesHistory }),
        ...(dto.campsHistory !== undefined && { campsHistory: dto.campsHistory }),
        ...(dto.successes !== undefined && { successes: dto.successes }),
        ...(dto.failures !== undefined && { failures: dto.failures }),
        ...(dto.supervisorFirstName !== undefined && { supervisorFirstName: dto.supervisorFirstName }),
        ...(dto.supervisorSecondName !== undefined && { supervisorSecondName: dto.supervisorSecondName }),
        ...(dto.supervisorSurname !== undefined && { supervisorSurname: dto.supervisorSurname }),
        ...(dto.supervisorInstructorRank !== undefined && { supervisorInstructorRank: dto.supervisorInstructorRank }),
        ...(dto.supervisorInstructorFunction !== undefined && { supervisorInstructorFunction: dto.supervisorInstructorFunction }),
      },
    });

    return { ok: true };
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async submit(principal: AuthPrincipal, applicationId: string) {
    const user = await this.resolveUserForWrite(principal);

    await this.prisma.$transaction(async (tx) => {
      // All checks inside transaction to prevent TOCTOU race conditions
      const fullApp = await tx.instructorApplication.findUnique({
        where: { uuid: applicationId },
        include: {
          template: true,
          requirements: { include: { requirementDefinition: true } },
          attachments: { where: { status: "ACTIVE" } },
        },
      });
      if (!fullApp) throw new NotFoundException("Application not found");
      if (fullApp.candidateUuid !== user.uuid) throw new ForbiddenException();
      if (fullApp.status !== ApplicationStatus.DRAFT && fullApp.status !== ApplicationStatus.TO_FIX) {
        throw new BadRequestException("Application is not editable");
      }

      // Validate required fields before submit
      this.validateRequiredFields(fullApp);

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
            uuid: user.uuid,
            firstName: user.firstName,
            surname: user.surname,
            email: user.email,
            hufiecCode: user.hufiecCode,
            druzynaCode: user.druzynaCode,
            scoutRank: user.scoutRank,
            instructorRank: user.instructorRank,
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
          candidateFirstName: user.firstName ?? "",
          candidateSurname: user.surname ?? "",
          candidateEmailAtSubmit: user.email ?? "",
          hufiecCodeAtSubmit: user.hufiecCode,
          druzynaCodeAtSubmit: user.druzynaCode,
          statusAtSubmit: ApplicationStatus.SUBMITTED,
        },
      });

      // Update application status
      await tx.instructorApplication.update({
        where: { uuid: fullApp.uuid },
        data: {
          status: ApplicationStatus.SUBMITTED,
          lastSubmittedAt: new Date(),
        },
      });
    });

    return { ok: true };
  }

  // ── Delete draft ─────────────────────────────────────────────────────────
  async deleteDraft(principal: AuthPrincipal, applicationId: string) {
    const app = await this.ensureOwnDraft(principal, applicationId);

    await this.prisma.instructorApplication.delete({
      where: { uuid: app.uuid },
    });

    return { ok: true };
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
      throw new NotFoundException("Requirement not found");
    }

    await this.prisma.instructorApplicationRequirement.update({
      where: { uuid: requirementId },
      data: {
        state: dto.state as RequirementState,
        actionDescription: dto.actionDescription,
        ...(dto.verificationText !== undefined && { verificationText: dto.verificationText }),
      },
    });

    return { ok: true };
  }

  private static readonly MAX_ATTACHMENTS_PER_APPLICATION = 50;

  /** Allowed MIME types detected by magic bytes (file-type library). */
  private static readonly MAGIC_BYTES_ALLOWLIST = new Set([
    // PDF
    "application/pdf",
    // Images
    "image/jpeg",
    "image/png",
    "image/webp",
    // Video
    "video/mp4",
    // Office (modern XML-based — detected as zip containers)
    "application/zip",
    // Office (legacy binary — detected as x-cfb)
    "application/x-cfb",
    // Presentations
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]);

  /**
   * Sanitize filename: replace dangerous chars, collapse multiple dots (keep only extension).
   * Preserves Unicode letters, digits, dot, dash, underscore, spaces.
   */
  static sanitizeFilename(raw: string): string {
    // Replace any character that isn't a Unicode letter, digit, dot, dash, underscore or space
    let name = raw.replace(/[^\p{L}\p{N}.\-_ ]/gu, "_");

    // Collapse multiple dots: keep only the last one (extension separator)
    // e.g. "evil.html.pdf" → "evil_html.pdf"
    const lastDot = name.lastIndexOf(".");
    if (lastDot > 0) {
      const base = name.slice(0, lastDot).replace(/\./g, "_");
      const ext = name.slice(lastDot);
      name = base + ext;
    }

    // Collapse multiple underscores/spaces
    name = name.replace(/_{2,}/g, "_").replace(/ {2,}/g, " ").trim();

    return name || "file";
  }

  // ── Presign upload ───────────────────────────────────────────────────────
  async presignAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: PresignUploadRequest,
  ) {
    await this.ensureOwnDraft(principal, applicationId);

    // BL-01: Enforce attachment limit to prevent storage DoS
    const attachmentCount = await this.prisma.attachment.count({
      where: { instructorApplicationUuid: applicationId, status: "ACTIVE" },
    });
    if (attachmentCount >= InstructorApplicationService.MAX_ATTACHMENTS_PER_APPLICATION) {
      throw new BadRequestException(
        `Osiągnięto limit ${InstructorApplicationService.MAX_ATTACHMENTS_PER_APPLICATION} załączników na wniosek`,
      );
    }

    const objectKey = this.storage.generateObjectKey(
      `instructor-applications/${applicationId}`,
      dto.filename,
    );

    const url = await this.storage.presignUpload(objectKey, dto.contentType);

    return { url, objectKey };
  }

  // ── Confirm upload ───────────────────────────────────────────────────────
  async confirmAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    dto: ConfirmUploadRequest,
  ) {
    await this.ensureOwnDraft(principal, applicationId);

    // H1: Validate objectKey belongs to this application
    const expectedPrefix = `instructor-applications/${applicationId}/`;
    if (!dto.objectKey.startsWith(expectedPrefix)) {
      throw new BadRequestException("Object key does not match this application");
    }

    // M1: Validate requirementUuid belongs to this application
    if (dto.requirementUuid) {
      const requirement = await this.prisma.instructorApplicationRequirement.findUnique({
        where: { uuid: dto.requirementUuid },
      });
      if (!requirement || requirement.applicationUuid !== applicationId) {
        throw new BadRequestException("Requirement does not belong to this application");
      }
    }

    // M3: Verify file exists in storage and check size
    const headResult = await this.storage.headObject(dto.objectKey);
    if (!headResult) {
      throw new BadRequestException("File not found in storage");
    }
    if (headResult.contentLength > 50_000_000) {
      throw new BadRequestException("File exceeds maximum size of 50 MB");
    }

    // Magic bytes verification: read first 4KB and verify actual file type
    const buffer = await this.storage.getObjectBuffer(dto.objectKey);
    if (buffer) {
      const detected = await fileTypeFromBuffer(buffer);
      // If file-type returns null (unrecognized format, e.g. .odt, .doc text), allow it through
      if (detected && !InstructorApplicationService.MAGIC_BYTES_ALLOWLIST.has(detected.mime)) {
        this.logger.warn(
          `Magic bytes mismatch: objectKey=${dto.objectKey}, detected=${detected.mime}, claimed=${dto.contentType}`,
        );
        await this.storage.deleteObject(dto.objectKey);
        throw new BadRequestException(
          `Typ pliku (${detected.mime}) nie jest dozwolony. Dozwolone: PDF, obrazy, wideo, dokumenty Office.`,
        );
      }
    }

    const sanitizedFilename = InstructorApplicationService.sanitizeFilename(dto.originalFilename);

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

  // ── Delete attachment ────────────────────────────────────────────────────
  async deleteAttachment(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
  ) {
    await this.ensureOwnDraft(principal, applicationId);

    const attachment = await this.prisma.attachment.findUnique({
      where: { uuid: attachmentId },
    });
    if (!attachment || attachment.instructorApplicationUuid !== applicationId) {
      throw new NotFoundException("Attachment not found");
    }

    try {
      await this.storage.deleteObject(attachment.objectKey);
    } catch (e) {
      this.logger.warn(`Failed to delete S3 object ${attachment.objectKey}: ${e}`);
    }
    await this.prisma.attachment.delete({ where: { uuid: attachmentId } });

    return { ok: true };
  }

  // ── Download attachment ─────────────────────────────────────────────────
  async getAttachmentDownloadUrl(
    principal: AuthPrincipal,
    applicationId: string,
    attachmentId: string,
    inline = false,
  ) {
    const user = await this.resolveUser(principal);
    const app = await this.prisma.instructorApplication.findUnique({
      where: { uuid: applicationId },
    });
    if (!app) throw new NotFoundException("Application not found");
    if (app.candidateUuid !== user.uuid) throw new ForbiddenException();

    const attachment = await this.prisma.attachment.findUnique({
      where: { uuid: attachmentId },
    });
    if (!attachment || attachment.instructorApplicationUuid !== applicationId) {
      throw new NotFoundException("Attachment not found");
    }

    const url = await this.storage.presignDownload(
      attachment.objectKey,
      attachment.originalFilename,
      { inline },
    );
    return { url, filename: attachment.originalFilename };
  }

  // ── Submit validation ────────────────────────────────────────────────────
  private validateRequiredFields(app: {
    teamFunction: string | null;
    hufiecFunction: string | null;
    openTrialForRank: string | null;
    plannedFinishAt: Date | null;
    hufcowyPresence: string | null;
    functionsHistory: string | null;
    coursesHistory: string | null;
    campsHistory: string | null;
    successes: string | null;
    failures: string | null;
    supervisorFirstName: string | null;
    supervisorSurname: string | null;
    supervisorInstructorRank: string | null;
    supervisorInstructorFunction: string | null;
    template: { degreeCode: string };
  }) {
    const missing: string[] = [];

    // Always required
    if (!app.plannedFinishAt) missing.push("plannedFinishAt");
    if (!app.hufcowyPresence) missing.push("hufcowyPresence");
    if (!app.functionsHistory?.trim()) missing.push("functionsHistory");
    if (!app.coursesHistory?.trim()) missing.push("coursesHistory");
    if (!app.campsHistory?.trim()) missing.push("campsHistory");
    if (!app.successes?.trim()) missing.push("successes");
    if (!app.failures?.trim()) missing.push("failures");
    if (!app.supervisorFirstName?.trim()) missing.push("supervisorFirstName");
    if (!app.supervisorSurname?.trim()) missing.push("supervisorSurname");
    if (!app.supervisorInstructorRank) missing.push("supervisorInstructorRank");
    if (!app.supervisorInstructorFunction?.trim()) missing.push("supervisorInstructorFunction");

    // Required only for degrees above PWD/PHM (e.g. HM)
    const BASIC_DEGREES = ["PWD", "PHM"];
    if (!BASIC_DEGREES.includes(app.template.degreeCode)) {
      if (!app.teamFunction?.trim()) missing.push("teamFunction");
      if (!app.hufiecFunction?.trim()) missing.push("hufiecFunction");
      if (!app.openTrialForRank) missing.push("openTrialForRank");
    }

    if (missing.length > 0) {
      throw new BadRequestException({
        code: "APPLICATION_INCOMPLETE",
        message: "Uzupełnij wszystkie wymagane pola przed złożeniem wniosku.",
        missingFields: missing,
      });
    }
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
        code: "PROFILE_REQUIRED",
        message: "Profil nie istnieje. Uzupełnij go w Dashboard.",
      });
    }
    return user;
  }

  /** Find user + enforce complete profile — for write operations (create, submit). */
  private async resolveUserForWrite(principal: AuthPrincipal) {
    const user = await this.resolveUser(principal);

    const missing: string[] = [];
    if (!user.firstName) missing.push("firstName");
    if (!user.surname) missing.push("surname");
    if (!user.email) missing.push("email");
    if (!user.phone) missing.push("phone");
    if (!user.birthDate) missing.push("birthDate");
    if (!user.hufiecCode) missing.push("hufiecCode");
    if (!user.druzynaCode) missing.push("druzynaCode");
    if (!user.scoutRank) missing.push("scoutRank");
    if (!user.inScoutingSince) missing.push("inScoutingSince");
    if (!user.inZhrSince) missing.push("inZhrSince");
    if (!user.oathDate) missing.push("oathDate");

    if (missing.length > 0) {
      throw new BadRequestException({
        code: "PROFILE_INCOMPLETE",
        message: "Uzupełnij profil w Dashboard przed utworzeniem wniosku.",
        missingFields: missing,
      });
    }

    return user;
  }

  private async ensureOwnDraft(principal: AuthPrincipal, applicationId: string) {
    const user = await this.resolveUser(principal);
    const app = await this.prisma.instructorApplication.findUnique({
      where: { uuid: applicationId },
    });
    if (!app) throw new NotFoundException("Application not found");
    if (app.candidateUuid !== user.uuid) throw new ForbiddenException();
    if (app.status !== ApplicationStatus.DRAFT && app.status !== ApplicationStatus.TO_FIX) {
      throw new BadRequestException("Application is not editable");
    }
    return app;
  }
}
