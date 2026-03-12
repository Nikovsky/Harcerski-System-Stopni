// @file: apps/api/src/modules/commission-review/commission-review.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CommissionRole,
  CommissionType,
  DegreeType,
  Prisma,
  Status,
} from '@hss/database';
import { createHash } from 'node:crypto';
import type {
  AuthPrincipal,
  CommissionReviewApplicationDetail,
  CommissionReviewApplicationListItem,
  CommissionReviewApplicationListQuery,
  CommissionReviewCandidateAnnotation,
  CommissionReviewCandidateAnnotationCreateBody,
  CommissionReviewCandidateAnnotationUpdateBody,
  CommissionReviewInternalNote,
  CommissionReviewInternalNoteCreateBody,
  CommissionReviewInternalNoteUpdateBody,
  CommissionReviewMembership,
  CommissionReviewResolvedRevisionRequest,
  CommissionReviewResolvedRevisionRequestListQuery,
  CommissionReviewResolvedRevisionRequestSummary,
  CommissionReviewRevisionRequest,
  CommissionReviewRevisionRequestCancelBody,
  CommissionReviewRevisionRequestDraftBody,
  CommissionReviewRevisionRequestPublishBody,
  CommissionReviewStatusTransitionBody,
  CommissionReviewTimelineEvent,
} from '@hss/schemas';
import { PrismaService } from '@/database/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';
import {
  buildInstructorApplicationCandidateEditScope,
  type PublishedRevisionRequestScopeRow,
} from '../instructor-application/instructor-application-edit-scope';
import { CommissionReviewAuditService } from './commission-review-audit.service';
import { CommissionReviewChangeAuditService } from './commission-review-change-audit.service';

const InstructorReviewAnchorType = {
  APPLICATION: 'APPLICATION',
  SECTION: 'SECTION',
  FIELD: 'FIELD',
  REQUIREMENT: 'REQUIREMENT',
  ATTACHMENT: 'ATTACHMENT',
} as const;

type InstructorReviewAnchorType =
  (typeof InstructorReviewAnchorType)[keyof typeof InstructorReviewAnchorType];

const InstructorReviewCandidateAnnotationStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const;

type InstructorReviewCandidateAnnotationStatus =
  (typeof InstructorReviewCandidateAnnotationStatus)[keyof typeof InstructorReviewCandidateAnnotationStatus];

const InstructorReviewRevisionRequestStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const;

type InstructorReviewRevisionRequestStatus =
  (typeof InstructorReviewRevisionRequestStatus)[keyof typeof InstructorReviewRevisionRequestStatus];

const COMMISSION_CANDIDATE_FEEDBACK_MODERATOR_ROLES: CommissionRole[] = [
  CommissionRole.SECRETARY,
  CommissionRole.CHAIRMAN,
];

const COMMISSION_WORKFLOW_MANAGER_ROLES: CommissionRole[] = [
  CommissionRole.SECRETARY,
  CommissionRole.CHAIRMAN,
];

const COMMISSION_VISIBLE_APPLICATION_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.TO_FIX,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.APPROVED,
  ApplicationStatus.IN_PROGRESS,
  ApplicationStatus.REPORT_SUBMITTED,
  ApplicationStatus.COMPLETED_POSITIVE,
  ApplicationStatus.REJECTED,
  ApplicationStatus.ARCHIVED,
];

const REVISION_REQUEST_DRAFT_ALLOWED_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.UNDER_REVIEW,
];

const OPEN_REVISION_REQUEST_STATUSES: InstructorReviewRevisionRequestStatus[] =
  [
    InstructorReviewRevisionRequestStatus.DRAFT,
    InstructorReviewRevisionRequestStatus.PUBLISHED,
  ];

function isActionableCandidateAnnotation(annotation: {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
}): boolean {
  switch (annotation.anchorType) {
    case InstructorReviewAnchorType.FIELD:
    case InstructorReviewAnchorType.REQUIREMENT:
    case InstructorReviewAnchorType.ATTACHMENT:
      return true;
    case InstructorReviewAnchorType.SECTION:
      return annotation.anchorKey === 'GENERAL_ATTACHMENTS';
    default:
      return false;
  }
}

function isCandidateAnnotationAnchorAllowed(
  anchorType: InstructorReviewAnchorType,
): boolean {
  return anchorType !== InstructorReviewAnchorType.SECTION;
}

const COMMISSION_WORKFLOW_TARGET_STATUSES: ApplicationStatus[] =
  COMMISSION_VISIBLE_APPLICATION_STATUSES.filter(
    (status) => status !== ApplicationStatus.DRAFT,
  );

const APPROVAL_ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.IN_PROGRESS,
  ApplicationStatus.REPORT_SUBMITTED,
  ApplicationStatus.COMPLETED_POSITIVE,
  ApplicationStatus.ARCHIVED,
];

const COMMISSION_AUTHOR_SELECT = {
  uuid: true,
  firstName: true,
  surname: true,
  email: true,
} satisfies Prisma.UserSelect;

const AUDIT_ACTOR_SELECT = {
  keycloakUuid: true,
  firstName: true,
  surname: true,
  email: true,
} satisfies Prisma.UserSelect;

const COMMISSION_MEMBERSHIP_SELECT = {
  commissionUuid: true,
  userUuid: true,
  role: true,
  commission: {
    select: {
      name: true,
      type: true,
    },
  },
} satisfies Prisma.CommissionMemberSelect;

const COMMISSION_REVIEW_LIST_ITEM_SELECT = {
  uuid: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lastSubmittedAt: true,
  candidate: {
    select: {
      firstName: true,
      surname: true,
      email: true,
    },
  },
  template: {
    select: {
      degreeCode: true,
      name: true,
    },
  },
  reviewRevisionRequests: {
    where: {
      status: {
        in: OPEN_REVISION_REQUEST_STATUSES,
      },
    },
    orderBy: { updatedAt: 'desc' as const },
    take: 1,
    select: {
      uuid: true,
      status: true,
    },
  },
} satisfies Prisma.InstructorApplicationSelect;

const COMMISSION_REVIEW_DETAIL_INCLUDE = {
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
        orderBy: { sortOrder: 'asc' as const },
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
        where: { status: Status.ACTIVE },
        orderBy: { uploadedAt: 'desc' as const },
        select: {
          uuid: true,
          originalFilename: true,
          contentType: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      },
    },
    orderBy: { requirementDefinition: { sortOrder: 'asc' as const } },
  },
  attachments: {
    where: { status: Status.ACTIVE, instructorRequirementUuid: null },
    orderBy: { uploadedAt: 'desc' as const },
    select: {
      uuid: true,
      originalFilename: true,
      contentType: true,
      sizeBytes: true,
      uploadedAt: true,
    },
  },
} satisfies Prisma.InstructorApplicationInclude;

const COMMISSION_REVIEW_INTERNAL_NOTE_SELECT = {
  uuid: true,
  anchorType: true,
  anchorKey: true,
  body: true,
  createdByUuid: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
} satisfies Prisma.InstructorReviewInternalNoteSelect;

const COMMISSION_REVIEW_CANDIDATE_ANNOTATION_SELECT = {
  uuid: true,
  anchorType: true,
  anchorKey: true,
  body: true,
  status: true,
  createdByUuid: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  resolvedAt: true,
  createdBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
} satisfies Prisma.InstructorReviewCandidateAnnotationSelect;

const COMMISSION_REVIEW_AUDIT_SNAPSHOT_SELECT = {
  uuid: true,
  revision: true,
  requirementsSnapshot: true,
  attachmentsMetadata: true,
  applicationDataSnapshot: true,
} satisfies Prisma.InstructorApplicationSnapshotSelect;

const COMMISSION_REVIEW_TIMELINE_REVISION_REQUEST_SELECT = {
  uuid: true,
  status: true,
  summaryMessage: true,
  updatedAt: true,
  publishedAt: true,
  resolvedAt: true,
  updatedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  publishedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  resolvedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

const COMMISSION_REVIEW_RESOLVED_REVISION_REQUEST_SUMMARY_SELECT = {
  uuid: true,
  summaryMessage: true,
  publishedAt: true,
  resolvedAt: true,
  baselineSnapshot: {
    select: {
      revision: true,
    },
  },
  responseSnapshot: {
    select: {
      revision: true,
    },
  },
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

const COMMISSION_REVIEW_RESOLVED_REVISION_REQUEST_AUDIT_SELECT = {
  uuid: true,
  summaryMessage: true,
  publishedAt: true,
  resolvedAt: true,
  baselineSnapshot: {
    select: COMMISSION_REVIEW_AUDIT_SNAPSHOT_SELECT,
  },
  responseSnapshot: {
    select: COMMISSION_REVIEW_AUDIT_SNAPSHOT_SELECT,
  },
  annotations: {
    where: {
      status: {
        not: InstructorReviewCandidateAnnotationStatus.CANCELLED,
      },
    },
    orderBy: [{ createdAt: 'asc' as const }, { uuid: 'asc' as const }],
    select: COMMISSION_REVIEW_CANDIDATE_ANNOTATION_SELECT,
  },
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

const COMMISSION_REVIEW_REVISION_REQUEST_SELECT = {
  uuid: true,
  status: true,
  summaryMessage: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  candidateFirstViewedAt: true,
  candidateFirstEditedAt: true,
  candidateLastActivityAt: true,
  resolvedAt: true,
  createdBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  updatedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  publishedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  resolvedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  baselineSnapshot: {
    select: COMMISSION_REVIEW_AUDIT_SNAPSHOT_SELECT,
  },
  responseSnapshot: {
    select: COMMISSION_REVIEW_AUDIT_SNAPSHOT_SELECT,
  },
  annotations: {
    where: {
      status: {
        not: InstructorReviewCandidateAnnotationStatus.CANCELLED,
      },
    },
    orderBy: [{ createdAt: 'asc' as const }, { uuid: 'asc' as const }],
    select: COMMISSION_REVIEW_CANDIDATE_ANNOTATION_SELECT,
  },
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

const OPEN_REVISION_REQUEST_STATE_SELECT = {
  uuid: true,
  status: true,
  summaryMessage: true,
  annotations: {
    where: {
      status: {
        in: [
          InstructorReviewCandidateAnnotationStatus.DRAFT,
          InstructorReviewCandidateAnnotationStatus.PUBLISHED,
        ],
      },
    },
    orderBy: [{ createdAt: 'asc' as const }, { uuid: 'asc' as const }],
    select: {
      uuid: true,
      anchorType: true,
      anchorKey: true,
      status: true,
    },
  },
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

const LEGACY_FIX_REQUEST_TIMELINE_SELECT = {
  uuid: true,
  status: true,
  message: true,
  updatedAt: true,
  publishedAt: true,
  resolvedAt: true,
  updatedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  publishedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
  resolvedBy: {
    select: COMMISSION_AUTHOR_SELECT,
  },
} satisfies Prisma.InstructorApplicationFixRequestSelect;

type CommissionMembershipRow = Prisma.CommissionMemberGetPayload<{
  select: typeof COMMISSION_MEMBERSHIP_SELECT;
}>;

type CommissionReviewListItemRow = Prisma.InstructorApplicationGetPayload<{
  select: typeof COMMISSION_REVIEW_LIST_ITEM_SELECT;
}>;

type CommissionReviewDetailRow = Prisma.InstructorApplicationGetPayload<{
  include: typeof COMMISSION_REVIEW_DETAIL_INCLUDE;
}>;

type CommissionReviewInternalNoteRow =
  Prisma.InstructorReviewInternalNoteGetPayload<{
    select: typeof COMMISSION_REVIEW_INTERNAL_NOTE_SELECT;
  }>;

type CommissionReviewCandidateAnnotationRow =
  Prisma.InstructorReviewCandidateAnnotationGetPayload<{
    select: typeof COMMISSION_REVIEW_CANDIDATE_ANNOTATION_SELECT;
  }>;

type CommissionReviewRevisionRequestRow =
  Prisma.InstructorReviewRevisionRequestGetPayload<{
    select: typeof COMMISSION_REVIEW_REVISION_REQUEST_SELECT;
  }>;

type CommissionReviewTimelineRevisionRequestRow =
  Prisma.InstructorReviewRevisionRequestGetPayload<{
    select: typeof COMMISSION_REVIEW_TIMELINE_REVISION_REQUEST_SELECT;
  }>;

type CommissionReviewResolvedRevisionRequestSummaryRow =
  Prisma.InstructorReviewRevisionRequestGetPayload<{
    select: typeof COMMISSION_REVIEW_RESOLVED_REVISION_REQUEST_SUMMARY_SELECT;
  }>;

type CommissionReviewResolvedRevisionRequestAuditRow =
  Prisma.InstructorReviewRevisionRequestGetPayload<{
    select: typeof COMMISSION_REVIEW_RESOLVED_REVISION_REQUEST_AUDIT_SELECT;
  }>;

type OpenRevisionRequestStateRow =
  Prisma.InstructorReviewRevisionRequestGetPayload<{
    select: typeof OPEN_REVISION_REQUEST_STATE_SELECT;
  }>;

type LegacyFixRequestTimelineRow =
  Prisma.InstructorApplicationFixRequestGetPayload<{
    select: typeof LEGACY_FIX_REQUEST_TIMELINE_SELECT;
  }>;

type AuditActorRow = Prisma.UserGetPayload<{
  select: typeof AUDIT_ACTOR_SELECT;
}>;

@Injectable()
export class CommissionReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly auditService: CommissionReviewAuditService,
    private readonly changeAuditService: CommissionReviewChangeAuditService,
  ) {}

  async listMemberships(principal: AuthPrincipal) {
    const memberships = await this.prisma.commissionMember.findMany({
      where: {
        status: Status.ACTIVE,
        leftAt: null,
        user: {
          keycloakUuid: principal.sub,
        },
        commission: {
          status: Status.ACTIVE,
        },
      },
      select: COMMISSION_MEMBERSHIP_SELECT,
      orderBy: { joinedAt: 'desc' },
    });

    return {
      memberships: memberships.map((membership) =>
        this.toMembershipDto(membership),
      ),
    };
  }

  async listInstructorApplications(
    principal: AuthPrincipal,
    commissionUuid: string,
    query: CommissionReviewApplicationListQuery,
  ) {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    const visibleStatuses = this.resolveRequestedStatuses(query.status);
    const where = this.buildApplicationListWhere(visibleStatuses, query.q);
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.instructorApplication.count({ where }),
      this.prisma.instructorApplication.findMany({
        where,
        select: COMMISSION_REVIEW_LIST_ITEM_SELECT,
        orderBy: this.buildApplicationListOrderBy(query),
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((item) => this.toListItemDto(item, membership)),
      total,
      page,
      pageSize,
    };
  }

  async getInstructorApplicationDetail(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
  ): Promise<CommissionReviewApplicationDetail> {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    const application = await this.findAccessibleApplicationDetail(
      applicationUuid,
      this.prisma,
    );
    const [
      internalNotes,
      activeRevisionRequest,
      timelineRevisionRequests,
      auditEvents,
    ] = await Promise.all([
      this.listInternalNotes(applicationUuid),
      this.findActiveRevisionRequest(applicationUuid),
      this.listTimelineRevisionRequests(applicationUuid),
      this.listTimelineAuditEvents(applicationUuid),
    ]);
    const auditActors = await this.resolveAuditActors(auditEvents);

    return {
      membership: this.toMembershipDto(membership),
      application: this.toApplicationDetailDto(
        application,
        this.toPublishedRevisionRequestScope(activeRevisionRequest),
      ),
      permissions: this.toPermissionsDto(membership, application.status),
      internalNotes: internalNotes.map((note) => this.toInternalNoteDto(note)),
      activeRevisionRequest: activeRevisionRequest
        ? this.toRevisionRequestDto(activeRevisionRequest)
        : null,
      availableTransitions: this.getAvailableTransitions(
        application.status,
        membership,
      ),
      timeline: this.buildTimeline(
        timelineRevisionRequests,
        auditEvents,
        auditActors,
      ),
    };
  }

  async listResolvedRevisionRequestAudits(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    query: CommissionReviewResolvedRevisionRequestListQuery,
  ) {
    await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    await this.findAccessibleApplicationSummary(applicationUuid, this.prisma);

    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;
    const where = {
      applicationUuid,
      status: InstructorReviewRevisionRequestStatus.RESOLVED,
    } satisfies Prisma.InstructorReviewRevisionRequestWhereInput;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.instructorReviewRevisionRequest.count({
        where,
      }),
      this.prisma.instructorReviewRevisionRequest.findMany({
        where,
        select: COMMISSION_REVIEW_RESOLVED_REVISION_REQUEST_SUMMARY_SELECT,
        orderBy: [
          { resolvedAt: 'desc' as const },
          { createdAt: 'desc' as const },
          { uuid: 'desc' as const },
        ],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((item) =>
        this.toResolvedRevisionRequestSummaryDto(item),
      ),
      total,
      page,
      pageSize,
    };
  }

  async getResolvedRevisionRequestAudit(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    revisionRequestUuid: string,
  ): Promise<CommissionReviewResolvedRevisionRequest> {
    await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    await this.findAccessibleApplicationSummary(applicationUuid, this.prisma);

    const revisionRequest =
      await this.prisma.instructorReviewRevisionRequest.findFirst({
        where: {
          uuid: revisionRequestUuid,
          applicationUuid,
          status: InstructorReviewRevisionRequestStatus.RESOLVED,
        },
        select: COMMISSION_REVIEW_RESOLVED_REVISION_REQUEST_AUDIT_SELECT,
      });

    if (!revisionRequest) {
      throw new NotFoundException({
        code: 'REVISION_REQUEST_AUDIT_NOT_FOUND',
        message: 'Resolved revision request audit not found.',
      });
    }

    return this.toResolvedRevisionRequestDto(revisionRequest);
  }

  async createInternalNote(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    dto: CommissionReviewInternalNoteCreateBody,
    requestId?: string | null,
  ): Promise<CommissionReviewInternalNote> {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );

    const note = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureInternalNoteStatusAllowsMutation(application.status);
      await this.ensureAnchorMatchesApplication(
        applicationUuid,
        dto.anchorType,
        dto.anchorKey,
        tx,
      );

      return tx.instructorReviewInternalNote.create({
        data: {
          applicationUuid,
          anchorType: dto.anchorType,
          anchorKey: dto.anchorKey,
          body: dto.body.trim(),
          createdByUuid: membership.userUuid,
        },
        select: COMMISSION_REVIEW_INTERNAL_NOTE_SELECT,
      });
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_INTERNAL_NOTE_CREATED',
      targetType: 'INSTRUCTOR_REVIEW_INTERNAL_NOTE',
      targetUuid: note.uuid,
      requestId,
      metadata: {
        applicationUuid,
        anchorType: dto.anchorType,
        anchorKey: dto.anchorKey,
      },
    });

    return this.toInternalNoteDto(note);
  }

  async updateInternalNote(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    noteUuid: string,
    dto: CommissionReviewInternalNoteUpdateBody,
    requestId?: string | null,
  ): Promise<CommissionReviewInternalNote> {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );

    const note = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureInternalNoteStatusAllowsMutation(application.status);

      const existingNote = await tx.instructorReviewInternalNote.findFirst({
        where: {
          uuid: noteUuid,
          applicationUuid,
        },
        select: {
          uuid: true,
          createdByUuid: true,
        },
      });

      if (!existingNote) {
        throw new NotFoundException({
          code: 'INTERNAL_NOTE_NOT_FOUND',
          message: 'Internal note not found.',
        });
      }

      this.ensureInternalNoteMutationAllowed(
        membership,
        existingNote.createdByUuid,
      );

      return tx.instructorReviewInternalNote.update({
        where: { uuid: noteUuid },
        data: {
          body: dto.body.trim(),
        },
        select: COMMISSION_REVIEW_INTERNAL_NOTE_SELECT,
      });
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_INTERNAL_NOTE_UPDATED',
      targetType: 'INSTRUCTOR_REVIEW_INTERNAL_NOTE',
      targetUuid: note.uuid,
      requestId,
      metadata: {
        applicationUuid,
      },
    });

    return this.toInternalNoteDto(note);
  }

  async deleteInternalNote(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    noteUuid: string,
    requestId?: string | null,
  ): Promise<{ uuid: string }> {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureInternalNoteStatusAllowsMutation(application.status);

      const existingNote = await tx.instructorReviewInternalNote.findFirst({
        where: {
          uuid: noteUuid,
          applicationUuid,
        },
        select: {
          uuid: true,
          createdByUuid: true,
        },
      });

      if (!existingNote) {
        throw new NotFoundException({
          code: 'INTERNAL_NOTE_NOT_FOUND',
          message: 'Internal note not found.',
        });
      }

      this.ensureInternalNoteMutationAllowed(
        membership,
        existingNote.createdByUuid,
      );

      await tx.instructorReviewInternalNote.delete({
        where: { uuid: noteUuid },
      });
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_INTERNAL_NOTE_DELETED',
      targetType: 'INSTRUCTOR_REVIEW_INTERNAL_NOTE',
      targetUuid: noteUuid,
      requestId,
      metadata: {
        applicationUuid,
      },
    });

    return { uuid: noteUuid };
  }

  async saveRevisionRequestDraft(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    dto: CommissionReviewRevisionRequestDraftBody,
    requestId?: string | null,
  ) {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    this.ensureCandidateFeedbackModerationAllowed(membership);
    const normalizedSummaryMessage = this.normalizeOptionalText(
      dto.summaryMessage,
    );

    const revisionRequest = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureRevisionRequestDraftAllowed(application.status);

      const openRevisionRequest = await this.findOpenRevisionRequestState(
        applicationUuid,
        tx,
      );

      if (
        openRevisionRequest?.status ===
        InstructorReviewRevisionRequestStatus.PUBLISHED
      ) {
        throw new ConflictException({
          code: 'REVISION_REQUEST_ALREADY_PUBLISHED',
          message:
            'A published revision request is already active for this application.',
        });
      }

      if (openRevisionRequest) {
        return tx.instructorReviewRevisionRequest.update({
          where: { uuid: openRevisionRequest.uuid },
          data: {
            ...(normalizedSummaryMessage !== undefined && {
              summaryMessage: normalizedSummaryMessage,
            }),
            updatedByUuid: membership.userUuid,
          },
          select: COMMISSION_REVIEW_REVISION_REQUEST_SELECT,
        });
      }

      return tx.instructorReviewRevisionRequest.create({
        data: {
          applicationUuid,
          status: InstructorReviewRevisionRequestStatus.DRAFT,
          summaryMessage:
            normalizedSummaryMessage === undefined
              ? null
              : normalizedSummaryMessage,
          createdByUuid: membership.userUuid,
          updatedByUuid: membership.userUuid,
        },
        select: COMMISSION_REVIEW_REVISION_REQUEST_SELECT,
      });
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_REVISION_REQUEST_DRAFT_SAVED',
      targetType: 'INSTRUCTOR_REVIEW_REVISION_REQUEST',
      targetUuid: revisionRequest.uuid,
      requestId,
      metadata: {
        applicationUuid,
        annotationCount: revisionRequest.annotations.length,
      },
    });

    return {
      revisionRequest: this.toRevisionRequestDto(revisionRequest),
    };
  }

  async createCandidateAnnotation(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    dto: CommissionReviewCandidateAnnotationCreateBody,
    requestId?: string | null,
  ): Promise<CommissionReviewCandidateAnnotation> {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    this.ensureCandidateAnnotationAnchorAllowed(dto.anchorType);

    const annotation = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureRevisionRequestDraftAllowed(application.status);
      await this.ensureAnchorMatchesApplication(
        applicationUuid,
        dto.anchorType,
        dto.anchorKey,
        tx,
      );

      const draftRevisionRequest = await this.getOrCreateDraftRevisionRequest(
        applicationUuid,
        membership.userUuid,
        tx,
      );

      const createdAnnotation =
        await tx.instructorReviewCandidateAnnotation.create({
          data: {
            revisionRequestUuid: draftRevisionRequest.uuid,
            anchorType: dto.anchorType,
            anchorKey: dto.anchorKey,
            body: dto.body.trim(),
            status: InstructorReviewCandidateAnnotationStatus.DRAFT,
            createdByUuid: membership.userUuid,
            updatedByUuid: membership.userUuid,
          },
          select: COMMISSION_REVIEW_CANDIDATE_ANNOTATION_SELECT,
        });

      await tx.instructorReviewRevisionRequest.update({
        where: { uuid: draftRevisionRequest.uuid },
        data: {
          updatedByUuid: membership.userUuid,
        },
      });

      return createdAnnotation;
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_CANDIDATE_ANNOTATION_CREATED',
      targetType: 'INSTRUCTOR_REVIEW_CANDIDATE_ANNOTATION',
      targetUuid: annotation.uuid,
      requestId,
      metadata: {
        applicationUuid,
        anchorType: dto.anchorType,
        anchorKey: dto.anchorKey,
      },
    });

    return this.toCandidateAnnotationDto(annotation);
  }

  private ensureCandidateAnnotationAnchorAllowed(
    anchorType: InstructorReviewAnchorType,
  ): void {
    if (isCandidateAnnotationAnchorAllowed(anchorType)) {
      return;
    }

    throw new BadRequestException({
      code: 'CANDIDATE_ANNOTATION_SECTION_NOT_ALLOWED',
      message:
        'Candidate annotations must target a field, requirement, attachment, or the whole application.',
    });
  }

  async updateCandidateAnnotation(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    annotationUuid: string,
    dto: CommissionReviewCandidateAnnotationUpdateBody,
    requestId?: string | null,
  ): Promise<CommissionReviewCandidateAnnotation> {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    const normalizedBody = this.normalizeOptionalText(dto.body);

    const updatedAnnotation = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureRevisionRequestDraftAllowed(application.status);

      const existingAnnotation =
        await tx.instructorReviewCandidateAnnotation.findFirst({
          where: {
            uuid: annotationUuid,
            revisionRequest: {
              applicationUuid,
            },
          },
          select: {
            uuid: true,
            status: true,
            createdByUuid: true,
            revisionRequestUuid: true,
            revisionRequest: {
              select: {
                status: true,
              },
            },
          },
        });

      if (!existingAnnotation) {
        throw new NotFoundException({
          code: 'CANDIDATE_ANNOTATION_NOT_FOUND',
          message: 'Candidate annotation not found.',
        });
      }

      if (
        existingAnnotation.revisionRequest.status !==
        InstructorReviewRevisionRequestStatus.DRAFT
      ) {
        throw new ConflictException({
          code: 'REVISION_REQUEST_NOT_DRAFT',
          message:
            'Only annotations from an active draft revision request can be updated.',
        });
      }

      if (
        existingAnnotation.status !==
        InstructorReviewCandidateAnnotationStatus.DRAFT
      ) {
        throw new ConflictException({
          code: 'CANDIDATE_ANNOTATION_NOT_DRAFT',
          message: 'Only draft candidate annotations can be updated.',
        });
      }

      this.ensureCandidateAnnotationMutationAllowed(
        membership,
        existingAnnotation.createdByUuid,
      );

      const annotation = await tx.instructorReviewCandidateAnnotation.update({
        where: { uuid: annotationUuid },
        data: {
          ...(normalizedBody !== undefined && { body: normalizedBody ?? '' }),
          ...(dto.status === 'CANCELLED' && {
            status: InstructorReviewCandidateAnnotationStatus.CANCELLED,
          }),
          updatedByUuid: membership.userUuid,
        },
        select: COMMISSION_REVIEW_CANDIDATE_ANNOTATION_SELECT,
      });

      await tx.instructorReviewRevisionRequest.update({
        where: { uuid: existingAnnotation.revisionRequestUuid },
        data: {
          updatedByUuid: membership.userUuid,
        },
      });

      return annotation;
    });

    await this.auditService.log({
      principal,
      action:
        dto.status === 'CANCELLED'
          ? 'COMMISSION_REVIEW_CANDIDATE_ANNOTATION_CANCELLED'
          : 'COMMISSION_REVIEW_CANDIDATE_ANNOTATION_UPDATED',
      targetType: 'INSTRUCTOR_REVIEW_CANDIDATE_ANNOTATION',
      targetUuid: annotationUuid,
      requestId,
      metadata: {
        applicationUuid,
      },
    });

    return this.toCandidateAnnotationDto(updatedAnnotation);
  }

  async publishRevisionRequest(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    dto: CommissionReviewRevisionRequestPublishBody,
    requestId?: string | null,
  ) {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    this.ensureCandidateFeedbackPublishAllowed(membership);

    const normalizedSummaryMessage = this.normalizeOptionalText(
      dto.summaryMessage,
    );
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureStatusOverrideAllowed(
        application.status,
        ApplicationStatus.TO_FIX,
      );

      const openRevisionRequest = await this.findOpenRevisionRequestState(
        applicationUuid,
        tx,
      );

      if (!openRevisionRequest) {
        throw new BadRequestException({
          code: 'REVISION_REQUEST_DRAFT_REQUIRED',
          message:
            'Create a draft revision request before publishing candidate feedback.',
        });
      }

      if (
        openRevisionRequest.status ===
        InstructorReviewRevisionRequestStatus.PUBLISHED
      ) {
        throw new ConflictException({
          code: 'REVISION_REQUEST_ALREADY_PUBLISHED',
          message:
            'A published revision request is already active for this application.',
        });
      }

      const draftAnnotations = openRevisionRequest.annotations ?? [];

      if (draftAnnotations.length === 0) {
        throw new BadRequestException({
          code: 'REVISION_REQUEST_ANNOTATIONS_REQUIRED',
          message:
            'At least one candidate annotation is required before publishing the revision request.',
        });
      }

      if (
        !draftAnnotations.some((annotation) =>
          isActionableCandidateAnnotation(annotation),
        )
      ) {
        throw new BadRequestException({
          code: 'REVISION_REQUEST_ACTIONABLE_ANNOTATION_REQUIRED',
          message:
            'At least one field, requirement, attachment, or general attachments annotation is required before publishing.',
        });
      }

      const baselineSnapshot = await tx.instructorApplicationSnapshot.findFirst(
        {
          where: {
            applicationUuid,
          },
          orderBy: [{ revision: 'desc' }, { submittedAt: 'desc' }],
          select: {
            uuid: true,
          },
        },
      );

      if (!baselineSnapshot) {
        throw new BadRequestException({
          code: 'REVISION_REQUEST_BASELINE_SNAPSHOT_REQUIRED',
          message:
            'A submitted application snapshot is required before publishing candidate feedback.',
        });
      }

      await tx.instructorReviewCandidateAnnotation.updateMany({
        where: {
          revisionRequestUuid: openRevisionRequest.uuid,
          status: InstructorReviewCandidateAnnotationStatus.DRAFT,
        },
        data: {
          status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
          updatedByUuid: membership.userUuid,
          publishedByUuid: membership.userUuid,
          publishedAt: now,
          resolvedByUuid: null,
          resolvedAt: null,
        },
      });

      const revisionRequest = await tx.instructorReviewRevisionRequest.update({
        where: { uuid: openRevisionRequest.uuid },
        data: {
          status: InstructorReviewRevisionRequestStatus.PUBLISHED,
          summaryMessage:
            normalizedSummaryMessage === undefined
              ? (openRevisionRequest.summaryMessage ?? null)
              : normalizedSummaryMessage,
          updatedByUuid: membership.userUuid,
          publishedByUuid: membership.userUuid,
          publishedAt: now,
          baselineSnapshotUuid: baselineSnapshot.uuid,
          responseSnapshotUuid: null,
          resolvedByUuid: null,
          resolvedAt: null,
        },
        select: COMMISSION_REVIEW_REVISION_REQUEST_SELECT,
      });

      const updatedApplication = await tx.instructorApplication.update({
        where: { uuid: applicationUuid },
        select: {
          uuid: true,
          status: true,
          updatedAt: true,
        },
        data: this.buildStatusUpdateData(
          application.status,
          ApplicationStatus.TO_FIX,
          now,
        ),
      });

      return {
        previousStatus: application.status,
        updatedApplication,
        revisionRequest,
      };
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_REVISION_REQUEST_PUBLISHED',
      targetType: 'INSTRUCTOR_REVIEW_REVISION_REQUEST',
      targetUuid: result.revisionRequest.uuid,
      requestId,
      metadata: {
        applicationUuid,
        annotationCount: result.revisionRequest.annotations.length,
      },
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_STATUS_CHANGED',
      targetType: 'INSTRUCTOR_APPLICATION',
      targetUuid: applicationUuid,
      requestId,
      metadata: {
        applicationUuid,
        fromStatus: result.previousStatus,
        toStatus: result.updatedApplication.status,
        note: null,
      },
    });

    return {
      revisionRequest: this.toRevisionRequestDto(result.revisionRequest),
      applicationStatus: result.updatedApplication.status,
      updatedAt: result.updatedApplication.updatedAt.toISOString(),
    };
  }

  async cancelRevisionRequest(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    dto: CommissionReviewRevisionRequestCancelBody,
    requestId?: string | null,
  ) {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    const note = dto.note?.trim() ? dto.note.trim() : null;
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      const openRevisionRequest = await this.findOpenRevisionRequestState(
        applicationUuid,
        tx,
      );

      if (!openRevisionRequest) {
        throw new NotFoundException({
          code: 'REVISION_REQUEST_NOT_FOUND',
          message: 'No active revision request was found for this application.',
        });
      }

      if (
        openRevisionRequest.status ===
        InstructorReviewRevisionRequestStatus.PUBLISHED
      ) {
        this.ensureWorkflowManagementAllowed(membership);

        if (application.status !== ApplicationStatus.TO_FIX) {
          throw new ConflictException({
            code: 'REVISION_REQUEST_STATUS_CONFLICT',
            message:
              'A published revision request can only be cancelled while the application is in TO_FIX.',
          });
        }

        const cancelledRevisionRequest = await this.cancelOpenRevisionRequest(
          openRevisionRequest.uuid,
          membership.userUuid,
          tx,
        );

        const updatedApplication = await tx.instructorApplication.update({
          where: { uuid: applicationUuid },
          select: {
            uuid: true,
            status: true,
            updatedAt: true,
          },
          data: this.buildStatusUpdateData(
            application.status,
            ApplicationStatus.UNDER_REVIEW,
            now,
          ),
        });

        return {
          previousStatus: application.status,
          updatedApplication,
          revisionRequest: cancelledRevisionRequest,
        };
      }

      this.ensureCandidateFeedbackModerationAllowed(membership);

      const cancelledRevisionRequest = await this.cancelOpenRevisionRequest(
        openRevisionRequest.uuid,
        membership.userUuid,
        tx,
      );

      return {
        previousStatus: application.status,
        updatedApplication: {
          uuid: application.uuid,
          status: application.status,
          updatedAt: now,
        },
        revisionRequest: cancelledRevisionRequest,
      };
    });

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_REVISION_REQUEST_CANCELLED',
      targetType: 'INSTRUCTOR_REVIEW_REVISION_REQUEST',
      targetUuid: result.revisionRequest.uuid,
      requestId,
      metadata: {
        applicationUuid,
      },
    });

    if (
      result.previousStatus === ApplicationStatus.TO_FIX &&
      result.updatedApplication.status === ApplicationStatus.UNDER_REVIEW
    ) {
      await this.auditService.log({
        principal,
        action: 'COMMISSION_REVIEW_STATUS_CHANGED',
        targetType: 'INSTRUCTOR_APPLICATION',
        targetUuid: applicationUuid,
        requestId,
        metadata: {
          applicationUuid,
          fromStatus: result.previousStatus,
          toStatus: result.updatedApplication.status,
          note,
        },
      });
    }

    return {
      revisionRequest: this.toRevisionRequestDto(result.revisionRequest),
      applicationStatus: result.updatedApplication.status,
      updatedAt: result.updatedApplication.updatedAt.toISOString(),
    };
  }

  async changeStatus(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    dto: CommissionReviewStatusTransitionBody,
    requestId?: string | null,
  ) {
    const membership = await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    this.ensureWorkflowManagementAllowed(membership);
    const transitionNote = dto.note?.trim() ? dto.note.trim() : null;

    if (dto.toStatus === ApplicationStatus.TO_FIX) {
      const publishResult = await this.publishRevisionRequest(
        principal,
        commissionUuid,
        applicationUuid,
        {
          summaryMessage: null,
        },
        requestId,
      );

      return {
        uuid: applicationUuid,
        status: publishResult.applicationStatus,
        updatedAt: publishResult.updatedAt,
        activeRevisionRequestStatus: publishResult.revisionRequest.status,
      };
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockApplicationRow(tx, applicationUuid);
      const application = await this.findAccessibleApplicationSummary(
        applicationUuid,
        tx,
      );
      this.ensureStatusOverrideAllowed(application.status, dto.toStatus);

      const openRevisionRequest = await this.findOpenRevisionRequestState(
        applicationUuid,
        tx,
      );

      let cancelledRevisionRequest: CommissionReviewRevisionRequestRow | null =
        null;

      if (
        openRevisionRequest?.status ===
        InstructorReviewRevisionRequestStatus.PUBLISHED
      ) {
        cancelledRevisionRequest = await this.cancelOpenRevisionRequest(
          openRevisionRequest.uuid,
          membership.userUuid,
          tx,
        );
      }

      if (
        openRevisionRequest?.status ===
          InstructorReviewRevisionRequestStatus.DRAFT &&
        !REVISION_REQUEST_DRAFT_ALLOWED_STATUSES.includes(dto.toStatus)
      ) {
        cancelledRevisionRequest = await this.cancelOpenRevisionRequest(
          openRevisionRequest.uuid,
          membership.userUuid,
          tx,
        );
      }

      const updatedApplication = await tx.instructorApplication.update({
        where: { uuid: applicationUuid },
        select: {
          uuid: true,
          status: true,
          updatedAt: true,
        },
        data: this.buildStatusUpdateData(application.status, dto.toStatus, now),
      });

      return {
        previousStatus: application.status,
        updatedApplication,
        cancelledRevisionRequest,
      };
    });

    if (result.cancelledRevisionRequest) {
      await this.auditService.log({
        principal,
        action: 'COMMISSION_REVIEW_REVISION_REQUEST_CANCELLED',
        targetType: 'INSTRUCTOR_REVIEW_REVISION_REQUEST',
        targetUuid: result.cancelledRevisionRequest.uuid,
        requestId,
        metadata: {
          applicationUuid,
        },
      });
    }

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_STATUS_CHANGED',
      targetType: 'INSTRUCTOR_APPLICATION',
      targetUuid: applicationUuid,
      requestId,
      metadata: {
        applicationUuid,
        fromStatus: result.previousStatus,
        toStatus: result.updatedApplication.status,
        note: transitionNote,
      },
    });

    return {
      uuid: result.updatedApplication.uuid,
      status: result.updatedApplication.status,
      updatedAt: result.updatedApplication.updatedAt.toISOString(),
      activeRevisionRequestStatus: null,
    };
  }

  async getAttachmentDownloadUrl(
    principal: AuthPrincipal,
    commissionUuid: string,
    applicationUuid: string,
    attachmentUuid: string,
    inline = false,
    requestId?: string | null,
  ) {
    await this.resolveMembershipForCommission(
      principal,
      commissionUuid,
      CommissionType.INSTRUCTOR,
    );
    await this.findAccessibleApplicationSummary(applicationUuid, this.prisma);

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        uuid: attachmentUuid,
        status: Status.ACTIVE,
        OR: [
          {
            instructorApplicationUuid: applicationUuid,
          },
          {
            instructorRequirement: {
              applicationUuid,
            },
          },
        ],
      },
      select: {
        uuid: true,
        objectKey: true,
        originalFilename: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Attachment not found.',
      });
    }

    const url = await this.storage.presignDownload(
      attachment.objectKey,
      attachment.originalFilename,
      { inline },
    );

    await this.auditService.log({
      principal,
      action: 'COMMISSION_REVIEW_ATTACHMENT_DOWNLOAD_URL_ISSUED',
      targetType: 'INSTRUCTOR_ATTACHMENT',
      targetUuid: attachment.uuid,
      requestId,
      metadata: {
        applicationUuid,
        inline,
      },
    });

    return { url, filename: attachment.originalFilename };
  }

  private async resolveMembershipForCommission(
    principal: AuthPrincipal,
    commissionUuid: string,
    commissionType: CommissionType,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<CommissionMembershipRow> {
    const membership = await client.commissionMember.findFirst({
      where: {
        commissionUuid,
        status: Status.ACTIVE,
        leftAt: null,
        user: {
          keycloakUuid: principal.sub,
        },
        commission: {
          status: Status.ACTIVE,
          type: commissionType,
        },
      },
      select: COMMISSION_MEMBERSHIP_SELECT,
    });

    if (!membership) {
      const commissionTypeLabel =
        commissionType === CommissionType.INSTRUCTOR ? 'instructor' : 'scout';
      throw new ForbiddenException({
        code: 'INSUFFICIENT_COMMISSION_MEMBERSHIP',
        message: `You need an active ${commissionTypeLabel} commission membership to access this area.`,
      });
    }

    return membership;
  }

  private toMembershipDto(
    membership: CommissionMembershipRow,
  ): CommissionReviewMembership {
    return {
      userUuid: membership.userUuid,
      commissionUuid: membership.commissionUuid,
      commissionName: membership.commission.name ?? null,
      commissionType: membership.commission.type,
      commissionRole: membership.role,
      canManageWorkflow: this.canManageWorkflow(membership.role),
      canDraftFixRequest:
        membership.commission.type === CommissionType.INSTRUCTOR,
      canModerateCandidateFeedback: this.canModerateCandidateFeedback(
        membership.role,
      ),
      canPublishCandidateFeedback: this.canPublishCandidateFeedback(
        membership.role,
      ),
      canChangeStatus: this.canChangeStatus(membership.role),
    };
  }

  private toPermissionsDto(
    membership: CommissionMembershipRow,
    applicationStatus: ApplicationStatus,
  ) {
    return {
      canComment: this.canCreateInternalNote(applicationStatus),
      canDraftFixRequest:
        membership.commission.type === CommissionType.INSTRUCTOR &&
        this.canPrepareRevisionRequestDraft(applicationStatus),
      canDraftCandidateFeedback:
        membership.commission.type === CommissionType.INSTRUCTOR &&
        this.canPrepareRevisionRequestDraft(applicationStatus),
      canModerateCandidateFeedback: this.canModerateCandidateFeedback(
        membership.role,
      ),
      canPublishCandidateFeedback: this.canPublishCandidateFeedback(
        membership.role,
      ),
      canChangeStatus: this.canChangeStatus(membership.role),
      canManageWorkflow: this.canManageWorkflow(membership.role),
      canViewAttachments: true,
    };
  }

  private canManageWorkflow(role: CommissionRole): boolean {
    return this.canChangeStatus(role);
  }

  private canPrepareRevisionRequestDraft(status: ApplicationStatus): boolean {
    return REVISION_REQUEST_DRAFT_ALLOWED_STATUSES.includes(status);
  }

  private canCreateInternalNote(status: ApplicationStatus): boolean {
    return status === ApplicationStatus.UNDER_REVIEW;
  }

  private canModerateCandidateFeedback(role: CommissionRole): boolean {
    return COMMISSION_CANDIDATE_FEEDBACK_MODERATOR_ROLES.includes(role);
  }

  private canPublishCandidateFeedback(role: CommissionRole): boolean {
    return COMMISSION_WORKFLOW_MANAGER_ROLES.includes(role);
  }

  private canChangeStatus(role: CommissionRole): boolean {
    return COMMISSION_WORKFLOW_MANAGER_ROLES.includes(role);
  }

  private ensureWorkflowManagementAllowed(
    membership: CommissionMembershipRow,
  ): void {
    if (this.canManageWorkflow(membership.role)) {
      return;
    }

    throw new ForbiddenException({
      code: 'INSUFFICIENT_COMMISSION_ROLE',
      message:
        'Only the commission secretary or chairman can manage application workflow.',
    });
  }

  private ensureCandidateFeedbackModerationAllowed(
    membership: CommissionMembershipRow,
  ): void {
    if (this.canModerateCandidateFeedback(membership.role)) {
      return;
    }

    throw new ForbiddenException({
      code: 'INSUFFICIENT_COMMISSION_ROLE',
      message:
        'Only the commission secretary or chairman can moderate draft candidate feedback.',
    });
  }

  private ensureCandidateFeedbackPublishAllowed(
    membership: CommissionMembershipRow,
  ): void {
    if (this.canPublishCandidateFeedback(membership.role)) {
      return;
    }

    throw new ForbiddenException({
      code: 'INSUFFICIENT_COMMISSION_ROLE',
      message:
        'Only the commission secretary or chairman can publish candidate feedback.',
    });
  }

  private ensureInternalNoteStatusAllowsMutation(
    status: ApplicationStatus,
  ): void {
    if (this.canCreateInternalNote(status)) {
      return;
    }

    throw new BadRequestException({
      code: 'COMMISSION_INTERNAL_NOTE_NOT_ALLOWED',
      message:
        'Commission notes can only be changed while the application is under review.',
    });
  }

  private ensureCandidateAnnotationMutationAllowed(
    membership: CommissionMembershipRow,
    authorUserUuid: string,
  ): void {
    if (
      membership.userUuid === authorUserUuid ||
      this.canModerateCandidateFeedback(membership.role)
    ) {
      return;
    }

    throw new ForbiddenException({
      code: 'CANDIDATE_ANNOTATION_EDIT_FORBIDDEN',
      message:
        'You can edit or delete only your own draft annotations unless you moderate candidate feedback.',
    });
  }

  private ensureInternalNoteMutationAllowed(
    membership: CommissionMembershipRow,
    authorUserUuid: string,
  ): void {
    if (membership.userUuid === authorUserUuid) {
      return;
    }

    throw new ForbiddenException({
      code: 'INTERNAL_NOTE_EDIT_FORBIDDEN',
      message: 'You can edit or delete only your own internal notes.',
    });
  }

  private resolveRequestedStatuses(
    statuses: ApplicationStatus[],
  ): ApplicationStatus[] {
    if (statuses.length === 0) {
      return COMMISSION_VISIBLE_APPLICATION_STATUSES;
    }

    return COMMISSION_VISIBLE_APPLICATION_STATUSES.filter((status) =>
      statuses.includes(status),
    );
  }

  private buildApplicationListWhere(
    statuses: ApplicationStatus[],
    queryText?: string,
  ): Prisma.InstructorApplicationWhereInput {
    const trimmedQuery = queryText?.trim();

    return {
      status: {
        in: statuses,
      },
      template: {
        degreeType: DegreeType.INSTRUCTOR,
      },
      ...(trimmedQuery
        ? {
            OR: [
              {
                candidate: {
                  firstName: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
              },
              {
                candidate: {
                  surname: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
              },
              {
                candidate: {
                  email: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
              },
              {
                template: {
                  degreeType: DegreeType.INSTRUCTOR,
                  degreeCode: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
              },
              {
                template: {
                  degreeType: DegreeType.INSTRUCTOR,
                  name: {
                    contains: trimmedQuery,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildApplicationListOrderBy(
    query: CommissionReviewApplicationListQuery,
  ): Prisma.InstructorApplicationOrderByWithRelationInput[] {
    const direction = query.direction;

    switch (query.sort) {
      case 'lastSubmittedAt':
        return [{ lastSubmittedAt: direction }, { updatedAt: 'desc' }];
      case 'candidateSurname':
        return [
          { candidate: { surname: direction } },
          { candidate: { firstName: direction } },
          { updatedAt: 'desc' },
        ];
      case 'updatedAt':
      default:
        return [{ updatedAt: direction }, { createdAt: 'desc' }];
    }
  }

  private toListItemDto(
    application: CommissionReviewListItemRow,
    membership: CommissionMembershipRow,
  ): CommissionReviewApplicationListItem {
    const availableTransitions = this.getAvailableTransitions(
      application.status,
      membership,
    );

    return {
      uuid: application.uuid,
      status: application.status,
      degreeCode: application.template.degreeCode,
      templateName: application.template.name,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      lastSubmittedAt: application.lastSubmittedAt?.toISOString() ?? null,
      candidateFirstName: application.candidate.firstName ?? null,
      candidateSurname: application.candidate.surname ?? null,
      candidateEmail: application.candidate.email ?? null,
      hasOpenFixRequest: application.reviewRevisionRequests.length > 0,
      canChangeStatus: availableTransitions.length > 0,
      canComment: this.canCreateInternalNote(application.status),
    };
  }

  private async findAccessibleApplicationDetail(
    applicationUuid: string,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<CommissionReviewDetailRow> {
    const application = await client.instructorApplication.findFirst({
      where: {
        uuid: applicationUuid,
        status: {
          in: COMMISSION_VISIBLE_APPLICATION_STATUSES,
        },
        template: {
          degreeType: DegreeType.INSTRUCTOR,
        },
      },
      include: COMMISSION_REVIEW_DETAIL_INCLUDE,
    });

    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found.',
      });
    }

    return application;
  }

  private async findAccessibleApplicationSummary(
    applicationUuid: string,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<{ uuid: string; status: ApplicationStatus }> {
    const application = await client.instructorApplication.findFirst({
      where: {
        uuid: applicationUuid,
        status: {
          in: COMMISSION_VISIBLE_APPLICATION_STATUSES,
        },
        template: {
          degreeType: DegreeType.INSTRUCTOR,
        },
      },
      select: {
        uuid: true,
        status: true,
      },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found.',
      });
    }

    return application;
  }

  private toPublishedRevisionRequestScope(
    revisionRequest: CommissionReviewRevisionRequestRow | null,
  ): PublishedRevisionRequestScopeRow | null {
    if (
      !revisionRequest ||
      revisionRequest.status !==
        InstructorReviewRevisionRequestStatus.PUBLISHED ||
      !revisionRequest.publishedAt
    ) {
      return null;
    }

    return {
      uuid: revisionRequest.uuid,
      summaryMessage: revisionRequest.summaryMessage ?? null,
      publishedAt: revisionRequest.publishedAt,
      candidateFirstViewedAt: revisionRequest.candidateFirstViewedAt,
      candidateFirstEditedAt: revisionRequest.candidateFirstEditedAt,
      candidateLastActivityAt: revisionRequest.candidateLastActivityAt,
      annotations: revisionRequest.annotations
        .filter((annotation) => annotation.status === 'PUBLISHED')
        .map((annotation) => ({
          uuid: annotation.uuid,
          anchorType: annotation.anchorType,
          anchorKey: annotation.anchorKey,
          body: annotation.body,
          publishedAt: annotation.publishedAt,
        })),
    };
  }

  private toApplicationDetailDto(
    application: CommissionReviewDetailRow,
    publishedRevisionRequestScope: PublishedRevisionRequestScopeRow | null,
  ) {
    const candidateEditScope = buildInstructorApplicationCandidateEditScope(
      application.status,
      publishedRevisionRequestScope,
    );

    return {
      uuid: application.uuid,
      status: application.status,
      plannedFinishAt:
        application.plannedFinishAt?.toISOString().split('T')[0] ?? null,
      teamFunction: application.teamFunction,
      hufiecFunction: application.hufiecFunction,
      openTrialForRank: application.openTrialForRank,
      openTrialDeadline:
        application.openTrialDeadline?.toISOString().split('T')[0] ?? null,
      hufcowyPresence: application.hufcowyPresence,
      hufcowyPresenceAttachmentUuid:
        application.hufcowyPresenceAttachmentUuid ?? null,
      functionsHistory: application.functionsHistory,
      coursesHistory: application.coursesHistory,
      campsHistory: application.campsHistory,
      successes: application.successes,
      failures: application.failures,
      supervisorFirstName: application.supervisorFirstName,
      supervisorSecondName: application.supervisorSecondName,
      supervisorSurname: application.supervisorSurname,
      supervisorInstructorRank: application.supervisorInstructorRank,
      supervisorInstructorFunction: application.supervisorInstructorFunction,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      lastSubmittedAt: application.lastSubmittedAt?.toISOString() ?? null,
      template: {
        uuid: application.template.uuid,
        degreeCode: application.template.degreeCode,
        name: application.template.name,
        version: application.template.version,
        groupDefinitions: application.template.definitions.map(
          (definition) => ({
            uuid: definition.uuid,
            code: definition.code,
            description: definition.description,
            sortOrder: definition.sortOrder,
            parentId: definition.parentId,
          }),
        ),
      },
      candidateProfile: {
        firstName: application.candidate.firstName,
        surname: application.candidate.surname,
        email: application.candidate.email,
        phone: application.candidate.phone,
        birthDate:
          application.candidate.birthDate?.toISOString().split('T')[0] ?? null,
        hufiecCode: application.candidate.hufiecCode,
        hufiecName: application.candidate.hufiec?.name ?? null,
        druzynaCode: application.candidate.druzynaCode,
        druzynaName: application.candidate.druzyna?.name ?? null,
        scoutRank: application.candidate.scoutRank,
        scoutRankAwardedAt:
          application.candidate.scoutRankAwardedAt
            ?.toISOString()
            .split('T')[0] ?? null,
        instructorRank: application.candidate.instructorRank,
        instructorRankAwardedAt:
          application.candidate.instructorRankAwardedAt
            ?.toISOString()
            .split('T')[0] ?? null,
        inScoutingSince:
          application.candidate.inScoutingSince?.toISOString().split('T')[0] ??
          null,
        inZhrSince:
          application.candidate.inZhrSince?.toISOString().split('T')[0] ?? null,
        oathDate:
          application.candidate.oathDate?.toISOString().split('T')[0] ?? null,
      },
      candidateEditScope,
      requirements: application.requirements.map((requirement) => ({
        uuid: requirement.uuid,
        requirementDefinitionUuid: requirement.requirementDefinitionUuid,
        state: requirement.state,
        actionDescription: requirement.actionDescription,
        verificationText: requirement.verificationText,
        definition: {
          uuid: requirement.requirementDefinition.uuid,
          code: requirement.requirementDefinition.code,
          description: requirement.requirementDefinition.description,
          isGroup: requirement.requirementDefinition.isGroup,
          sortOrder: requirement.requirementDefinition.sortOrder,
          parentId: requirement.requirementDefinition.parentId,
        },
        attachments: requirement.attachments.map((attachment) => ({
          uuid: attachment.uuid,
          originalFilename: attachment.originalFilename,
          contentType: attachment.contentType,
          sizeBytes: Number(attachment.sizeBytes),
          uploadedAt: attachment.uploadedAt.toISOString(),
        })),
      })),
      attachments: application.attachments.map((attachment) => ({
        uuid: attachment.uuid,
        originalFilename: attachment.originalFilename,
        contentType: attachment.contentType,
        sizeBytes: Number(attachment.sizeBytes),
        uploadedAt: attachment.uploadedAt.toISOString(),
      })),
    };
  }

  private async listInternalNotes(applicationUuid: string) {
    return this.prisma.instructorReviewInternalNote.findMany({
      where: {
        applicationUuid,
      },
      select: COMMISSION_REVIEW_INTERNAL_NOTE_SELECT,
      orderBy: [{ createdAt: 'desc' }, { uuid: 'desc' }],
    });
  }

  private async findActiveRevisionRequest(
    applicationUuid: string,
  ): Promise<CommissionReviewRevisionRequestRow | null> {
    return this.prisma.instructorReviewRevisionRequest.findFirst({
      where: {
        applicationUuid,
        status: {
          in: OPEN_REVISION_REQUEST_STATUSES,
        },
      },
      select: COMMISSION_REVIEW_REVISION_REQUEST_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }, { uuid: 'desc' }],
    });
  }

  private async listTimelineRevisionRequests(
    applicationUuid: string,
  ): Promise<CommissionReviewTimelineRevisionRequestRow[]> {
    return this.prisma.instructorReviewRevisionRequest.findMany({
      where: {
        applicationUuid,
      },
      select: COMMISSION_REVIEW_TIMELINE_REVISION_REQUEST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { uuid: 'desc' }],
    });
  }

  private async listLegacyFixRequests(
    applicationUuid: string,
  ): Promise<LegacyFixRequestTimelineRow[]> {
    return this.prisma.instructorApplicationFixRequest.findMany({
      where: {
        applicationUuid,
      },
      select: LEGACY_FIX_REQUEST_TIMELINE_SELECT,
      orderBy: [{ createdAt: 'desc' }, { uuid: 'desc' }],
    });
  }

  private async listTimelineAuditEvents(applicationUuid: string) {
    return this.prisma.auditEvent.findMany({
      where: {
        targetType: 'INSTRUCTOR_APPLICATION',
        targetUuid: applicationUuid,
        action: {
          in: [
            'COMMISSION_REVIEW_STATUS_CHANGED',
            'INSTRUCTOR_APPLICATION_SUBMITTED',
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { uuid: 'desc' }],
    });
  }

  private async resolveAuditActors(
    auditEvents: Array<{
      actorKeycloakUuid: string;
    }>,
  ): Promise<Map<string, AuditActorRow>> {
    const actorKeycloakUuids = Array.from(
      new Set(auditEvents.map((event) => event.actorKeycloakUuid)),
    );

    if (actorKeycloakUuids.length === 0) {
      return new Map();
    }

    const actors = await this.prisma.user.findMany({
      where: {
        keycloakUuid: {
          in: actorKeycloakUuids,
        },
      },
      select: AUDIT_ACTOR_SELECT,
    });

    return new Map(actors.map((actor) => [actor.keycloakUuid, actor]));
  }

  private toInternalNoteDto(
    note: CommissionReviewInternalNoteRow,
  ): CommissionReviewInternalNote {
    return {
      uuid: note.uuid,
      anchorType: note.anchorType,
      anchorKey: note.anchorKey,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      author: this.toAuthorDto(note.createdBy),
    };
  }

  private toCandidateAnnotationDto(
    annotation: CommissionReviewCandidateAnnotationRow,
  ): CommissionReviewCandidateAnnotation {
    return {
      uuid: annotation.uuid,
      anchorType: annotation.anchorType,
      anchorKey: annotation.anchorKey,
      body: annotation.body,
      status: annotation.status,
      createdAt: annotation.createdAt.toISOString(),
      updatedAt: annotation.updatedAt.toISOString(),
      publishedAt: annotation.publishedAt?.toISOString() ?? null,
      resolvedAt: annotation.resolvedAt?.toISOString() ?? null,
      author: this.toAuthorDto(annotation.createdBy),
    };
  }

  private toRevisionRequestDto(
    revisionRequest: CommissionReviewRevisionRequestRow,
  ): CommissionReviewRevisionRequest {
    return {
      uuid: revisionRequest.uuid,
      status: revisionRequest.status,
      summaryMessage: revisionRequest.summaryMessage ?? null,
      createdAt: revisionRequest.createdAt.toISOString(),
      updatedAt: revisionRequest.updatedAt.toISOString(),
      publishedAt: revisionRequest.publishedAt?.toISOString() ?? null,
      candidateFirstViewedAt:
        revisionRequest.candidateFirstViewedAt?.toISOString() ?? null,
      candidateFirstEditedAt:
        revisionRequest.candidateFirstEditedAt?.toISOString() ?? null,
      candidateLastActivityAt:
        revisionRequest.candidateLastActivityAt?.toISOString() ?? null,
      resolvedAt: revisionRequest.resolvedAt?.toISOString() ?? null,
      createdBy: this.toAuthorDto(revisionRequest.createdBy),
      updatedBy: revisionRequest.updatedBy
        ? this.toAuthorDto(revisionRequest.updatedBy)
        : null,
      publishedBy: revisionRequest.publishedBy
        ? this.toAuthorDto(revisionRequest.publishedBy)
        : null,
      resolvedBy: revisionRequest.resolvedBy
        ? this.toAuthorDto(revisionRequest.resolvedBy)
        : null,
      annotations: revisionRequest.annotations.map((annotation) =>
        this.toCandidateAnnotationDto(annotation),
      ),
    };
  }

  private toResolvedRevisionRequestSummaryDto(
    revisionRequest: CommissionReviewResolvedRevisionRequestSummaryRow,
  ): CommissionReviewResolvedRevisionRequestSummary {
    return {
      revisionRequest: {
        uuid: revisionRequest.uuid,
        summaryMessage: revisionRequest.summaryMessage ?? null,
        publishedAt: revisionRequest.publishedAt?.toISOString() ?? null,
        resolvedAt: revisionRequest.resolvedAt?.toISOString() ?? null,
      },
      auditAvailable:
        revisionRequest.baselineSnapshot !== null &&
        revisionRequest.responseSnapshot !== null,
      auditMissingReason:
        revisionRequest.baselineSnapshot === null
          ? 'BASELINE_SNAPSHOT_MISSING'
          : revisionRequest.responseSnapshot === null
            ? 'RESPONSE_SNAPSHOT_MISSING'
            : null,
      baselineSnapshotRevision:
        revisionRequest.baselineSnapshot?.revision ?? null,
      responseSnapshotRevision:
        revisionRequest.responseSnapshot?.revision ?? null,
    };
  }

  private toResolvedRevisionRequestDto(
    revisionRequest: CommissionReviewResolvedRevisionRequestAuditRow,
  ): CommissionReviewResolvedRevisionRequest {
    return this.changeAuditService.buildResolvedRevisionRequestAudit({
      revisionRequest: {
        uuid: revisionRequest.uuid,
        summaryMessage: revisionRequest.summaryMessage ?? null,
        publishedAt: revisionRequest.publishedAt?.toISOString() ?? null,
        resolvedAt: revisionRequest.resolvedAt?.toISOString() ?? null,
      },
      annotations: revisionRequest.annotations.map((annotation) =>
        this.toCandidateAnnotationDto(annotation),
      ),
      baselineSnapshot: revisionRequest.baselineSnapshot,
      responseSnapshot: revisionRequest.responseSnapshot,
    });
  }

  private toAuthorDto(author: {
    uuid: string;
    firstName: string | null;
    surname: string | null;
    email: string | null;
  }) {
    return {
      userUuid: author.uuid,
      firstName: author.firstName,
      surname: author.surname,
      email: author.email,
    };
  }

  private getAvailableTransitions(
    status: ApplicationStatus,
    membership: CommissionMembershipRow,
  ): ApplicationStatus[] {
    if (!this.canManageWorkflow(membership.role)) {
      return [];
    }

    return COMMISSION_WORKFLOW_TARGET_STATUSES.filter(
      (transition) => transition !== status,
    );
  }

  private buildTimeline(
    revisionRequests: CommissionReviewTimelineRevisionRequestRow[],
    auditEvents: Array<{
      uuid: string;
      action: string;
      createdAt: Date;
      actorKeycloakUuid: string;
      metadata: Prisma.JsonValue;
    }>,
    auditActors: Map<string, AuditActorRow>,
  ): CommissionReviewTimelineEvent[] {
    const revisionRequestEvents = revisionRequests.flatMap((revisionRequest) =>
      this.buildRevisionRequestTimelineEvents({
        uuid: revisionRequest.uuid,
        status: revisionRequest.status,
        summaryMessage: revisionRequest.summaryMessage,
        updatedAt: revisionRequest.updatedAt,
        publishedAt: revisionRequest.publishedAt,
        resolvedAt: revisionRequest.resolvedAt,
        updatedBy: revisionRequest.updatedBy,
        publishedBy: revisionRequest.publishedBy,
        resolvedBy: revisionRequest.resolvedBy,
      }),
    );

    const auditTimelineEvents = auditEvents.reduce<
      CommissionReviewTimelineEvent[]
    >((events, event) => {
      const actor = auditActors.get(event.actorKeycloakUuid) ?? null;

      if (event.action === 'COMMISSION_REVIEW_STATUS_CHANGED') {
        const fromStatus = this.readApplicationStatusMetadata(
          event.metadata,
          'fromStatus',
        );
        const toStatus = this.readApplicationStatusMetadata(
          event.metadata,
          'toStatus',
        );

        if (!toStatus) {
          return events;
        }

        events.push({
          kind: 'STATUS_CHANGE',
          uuid: event.uuid,
          createdAt: event.createdAt.toISOString(),
          actorDisplayName: this.formatAuditActorDisplayName(
            actor,
            event.actorKeycloakUuid,
          ),
          fromStatus,
          toStatus,
          note: this.readOptionalMetadataString(event.metadata, 'note'),
        });
        return events;
      }

      if (event.action === 'INSTRUCTOR_APPLICATION_SUBMITTED') {
        events.push({
          kind: 'SYSTEM_EVENT',
          uuid: event.uuid,
          createdAt: event.createdAt.toISOString(),
          actorDisplayName: this.formatAuditActorDisplayName(
            actor,
            event.actorKeycloakUuid,
          ),
          action: event.action,
          summary: 'Application submitted for review.',
        });
      }

      return events;
    }, []);

    return [...revisionRequestEvents, ...auditTimelineEvents].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }

  private buildRevisionRequestTimelineEvents(revisionRequest: {
    uuid: string;
    status: InstructorReviewRevisionRequestStatus;
    summaryMessage: string | null;
    updatedAt: Date;
    publishedAt: Date | null;
    resolvedAt: Date | null;
    updatedBy: {
      firstName: string | null;
      surname: string | null;
      email: string | null;
    } | null;
    publishedBy: {
      firstName: string | null;
      surname: string | null;
      email: string | null;
    } | null;
    resolvedBy: {
      firstName: string | null;
      surname: string | null;
      email: string | null;
    } | null;
  }): CommissionReviewTimelineEvent[] {
    const events: CommissionReviewTimelineEvent[] = [];

    if (revisionRequest.publishedAt && revisionRequest.publishedBy) {
      events.push({
        kind: 'REVISION_REQUEST',
        uuid: this.createDeterministicTimelineUuid(
          `${revisionRequest.uuid}:published`,
        ),
        createdAt: revisionRequest.publishedAt.toISOString(),
        action: 'PUBLISHED',
        actorDisplayName: this.formatAuthorDisplayName(
          revisionRequest.publishedBy,
        ),
        summaryMessage: revisionRequest.summaryMessage ?? null,
      });
    }

    if (revisionRequest.resolvedAt && revisionRequest.resolvedBy) {
      events.push({
        kind: 'REVISION_REQUEST',
        uuid: this.createDeterministicTimelineUuid(
          `${revisionRequest.uuid}:resolved`,
        ),
        createdAt: revisionRequest.resolvedAt.toISOString(),
        action: 'RESOLVED',
        actorDisplayName: this.formatAuthorDisplayName(
          revisionRequest.resolvedBy,
        ),
        summaryMessage: revisionRequest.summaryMessage ?? null,
      });
    }

    if (
      revisionRequest.status ===
        InstructorReviewRevisionRequestStatus.CANCELLED &&
      revisionRequest.updatedBy
    ) {
      events.push({
        kind: 'REVISION_REQUEST',
        uuid: this.createDeterministicTimelineUuid(
          `${revisionRequest.uuid}:cancelled`,
        ),
        createdAt: revisionRequest.updatedAt.toISOString(),
        action: 'CANCELLED',
        actorDisplayName: this.formatAuthorDisplayName(
          revisionRequest.updatedBy,
        ),
        summaryMessage: revisionRequest.summaryMessage ?? null,
      });
    }

    return events;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private ensureRevisionRequestDraftAllowed(status: ApplicationStatus): void {
    if (this.canPrepareRevisionRequestDraft(status)) {
      return;
    }

    throw new BadRequestException({
      code: 'REVISION_REQUEST_DRAFT_NOT_ALLOWED',
      message:
        'Candidate feedback drafts can only be changed while the application is under review.',
    });
  }

  private ensureStatusOverrideAllowed(
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
  ): void {
    if (
      COMMISSION_WORKFLOW_TARGET_STATUSES.includes(toStatus) &&
      fromStatus !== toStatus
    ) {
      return;
    }

    throw new BadRequestException({
      code: 'INVALID_STATUS_TRANSITION',
      message: `Status override from ${fromStatus} to ${toStatus} is not allowed.`,
    });
  }

  private buildStatusUpdateData(
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    at: Date,
  ): Prisma.InstructorApplicationUpdateInput {
    return {
      status: toStatus,
      ...(toStatus === ApplicationStatus.APPROVED &&
        !APPROVAL_ACTIVE_STATUSES.includes(fromStatus) && {
          approvedAt: at,
        }),
      ...(APPROVAL_ACTIVE_STATUSES.includes(fromStatus) &&
        !APPROVAL_ACTIVE_STATUSES.includes(toStatus) && {
          approvedAt: null,
        }),
      ...(toStatus === ApplicationStatus.ARCHIVED && {
        archivedAt: at,
      }),
      ...(fromStatus === ApplicationStatus.ARCHIVED &&
        toStatus !== ApplicationStatus.ARCHIVED && {
          archivedAt: null,
        }),
    };
  }

  private async ensureAnchorMatchesApplication(
    applicationUuid: string,
    anchorType: InstructorReviewAnchorType,
    anchorKey: string,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    switch (anchorType) {
      case InstructorReviewAnchorType.APPLICATION: {
        if (anchorKey !== applicationUuid) {
          throw new BadRequestException({
            code: 'REVIEW_ANCHOR_INVALID',
            message:
              'Application-level annotations must point to the current application UUID.',
          });
        }
        return;
      }
      case InstructorReviewAnchorType.REQUIREMENT: {
        await this.ensureRequirementBelongsToApplication(
          applicationUuid,
          anchorKey,
          client,
        );
        return;
      }
      case InstructorReviewAnchorType.ATTACHMENT: {
        const attachment = await client.attachment.findFirst({
          where: {
            uuid: anchorKey,
            status: Status.ACTIVE,
            OR: [
              {
                instructorApplicationUuid: applicationUuid,
              },
              {
                instructorRequirement: {
                  applicationUuid,
                },
              },
            ],
          },
          select: {
            uuid: true,
          },
        });

        if (!attachment) {
          throw new NotFoundException({
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Attachment not found.',
          });
        }
        return;
      }
      case InstructorReviewAnchorType.FIELD:
      case InstructorReviewAnchorType.SECTION:
      default:
        return;
    }
  }

  private async ensureRequirementBelongsToApplication(
    applicationUuid: string,
    requirementUuid: string,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    const requirement =
      await client.instructorApplicationRequirement.findUnique({
        where: { uuid: requirementUuid },
        select: {
          applicationUuid: true,
        },
      });

    if (!requirement || requirement.applicationUuid !== applicationUuid) {
      throw new NotFoundException({
        code: 'REQUIREMENT_NOT_FOUND',
        message: 'Requirement not found.',
      });
    }
  }

  private async findOpenRevisionRequestState(
    applicationUuid: string,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<OpenRevisionRequestStateRow | null> {
    return client.instructorReviewRevisionRequest.findFirst({
      where: {
        applicationUuid,
        status: {
          in: OPEN_REVISION_REQUEST_STATUSES,
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: OPEN_REVISION_REQUEST_STATE_SELECT,
    });
  }

  private async getOrCreateDraftRevisionRequest(
    applicationUuid: string,
    userUuid: string,
    client: Prisma.TransactionClient,
  ): Promise<{ uuid: string }> {
    const openRevisionRequest = await this.findOpenRevisionRequestState(
      applicationUuid,
      client,
    );

    if (
      openRevisionRequest?.status ===
      InstructorReviewRevisionRequestStatus.PUBLISHED
    ) {
      throw new ConflictException({
        code: 'REVISION_REQUEST_ALREADY_PUBLISHED',
        message:
          'A published revision request is already active for this application.',
      });
    }

    if (openRevisionRequest) {
      return { uuid: openRevisionRequest.uuid };
    }

    return client.instructorReviewRevisionRequest.create({
      data: {
        applicationUuid,
        status: InstructorReviewRevisionRequestStatus.DRAFT,
        createdByUuid: userUuid,
        updatedByUuid: userUuid,
      },
      select: {
        uuid: true,
      },
    });
  }

  private async cancelOpenRevisionRequest(
    revisionRequestUuid: string,
    userUuid: string,
    client: Prisma.TransactionClient,
  ): Promise<CommissionReviewRevisionRequestRow> {
    await client.instructorReviewCandidateAnnotation.updateMany({
      where: {
        revisionRequestUuid,
        status: {
          in: [
            InstructorReviewCandidateAnnotationStatus.DRAFT,
            InstructorReviewCandidateAnnotationStatus.PUBLISHED,
          ],
        },
      },
      data: {
        status: InstructorReviewCandidateAnnotationStatus.CANCELLED,
        updatedByUuid: userUuid,
      },
    });

    return client.instructorReviewRevisionRequest.update({
      where: { uuid: revisionRequestUuid },
      data: {
        status: InstructorReviewRevisionRequestStatus.CANCELLED,
        updatedByUuid: userUuid,
      },
      select: COMMISSION_REVIEW_REVISION_REQUEST_SELECT,
    });
  }

  private formatAuthorDisplayName(author: {
    firstName: string | null;
    surname: string | null;
    email: string | null;
  }): string {
    return this.formatDisplayName(
      author.firstName,
      author.surname,
      author.email,
      'Unknown user',
    );
  }

  private formatAuditActorDisplayName(
    actor: AuditActorRow | null,
    fallbackKeycloakUuid: string,
  ): string {
    if (!actor) {
      return fallbackKeycloakUuid;
    }

    return this.formatDisplayName(
      actor.firstName,
      actor.surname,
      actor.email,
      fallbackKeycloakUuid,
    );
  }

  private formatDisplayName(
    firstName: string | null,
    surname: string | null,
    email: string | null,
    fallback: string,
  ): string {
    const fullName = [firstName, surname].filter(Boolean).join(' ').trim();
    if (fullName.length > 0) {
      return fullName;
    }

    return email ?? fallback;
  }

  private readApplicationStatusMetadata(
    metadata: Prisma.JsonValue,
    key: string,
  ): ApplicationStatus | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const rawValue = (metadata as Record<string, Prisma.JsonValue>)[key];
    if (typeof rawValue !== 'string') {
      return null;
    }

    return this.isApplicationStatus(rawValue) ? rawValue : null;
  }

  private readOptionalMetadataString(
    metadata: Prisma.JsonValue,
    key: string,
  ): string | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const rawValue = (metadata as Record<string, Prisma.JsonValue>)[key];
    if (typeof rawValue !== 'string') {
      return null;
    }

    const normalized = rawValue.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private isApplicationStatus(value: string): value is ApplicationStatus {
    return (Object.values(ApplicationStatus) as string[]).includes(value);
  }

  private createDeterministicTimelineUuid(seed: string): string {
    const digest = createHash('sha256').update(seed).digest('hex').slice(0, 32);
    const characters = digest.split('');
    characters[12] = '4';
    characters[16] = ['8', '9', 'a', 'b'][parseInt(characters[16], 16) % 4];
    const normalized = characters.join('');

    return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(
      12,
      16,
    )}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
  }

  private async lockApplicationRow(
    tx: Prisma.TransactionClient,
    applicationUuid: string,
  ): Promise<void> {
    await tx.$executeRaw(
      Prisma.sql`
        SELECT 1
          FROM "InstructorApplication"
         WHERE "uuid" = ${applicationUuid}::uuid
         FOR UPDATE
      `,
    );
  }
}
