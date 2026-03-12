// @file: apps/api/src/modules/commission-review/commission-review.service.spec.ts
import {
  ApplicationStatus,
  CommissionRole,
  CommissionType,
  InstructorReviewCandidateAnnotationStatus,
  InstructorReviewRevisionRequestStatus,
} from '@hss/database';
import type { AuthPrincipal } from '@hss/schemas';

jest.mock(
  '@/database/prisma/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
  { virtual: true },
);

jest.mock(
  '@/modules/storage/storage.service',
  () => ({
    StorageService: class StorageService {},
  }),
  { virtual: true },
);

jest.mock('./commission-review-audit.service', () => ({
  CommissionReviewAuditService: class CommissionReviewAuditService {
    log = jest.fn();
  },
}));

jest.mock('./commission-review-change-audit.service', () => ({
  CommissionReviewChangeAuditService: class CommissionReviewChangeAuditService {
    buildResolvedRevisionRequestAudit = jest.fn();
  },
}));

import { CommissionReviewService } from './commission-review.service';

const PRINCIPAL: AuthPrincipal = {
  sub: '11111111-1111-1111-1111-111111111111',
  realmRoles: [],
  clientRoles: [],
};

const USER_UUID = '22222222-2222-2222-2222-222222222222';
const COMMISSION_UUID = '33333333-3333-3333-3333-333333333333';
const APPLICATION_UUID = '44444444-4444-4444-4444-444444444444';
const REVISION_REQUEST_UUID = '55555555-5555-5555-5555-555555555555';
const ANNOTATION_UUID = '66666666-6666-6666-6666-666666666666';
const SNAPSHOT_UUID = '77777777-7777-7777-7777-777777777777';

type MockCallSource = {
  mock: {
    calls: unknown[][];
  };
};

type AuditLogEntry = {
  action?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  targetUuid?: string;
};

async function expectRejectsWithCode(
  operation: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(operation).rejects.toMatchObject({
    response: {
      code,
    },
  });
}

function getLastMockArg<T>(mockFn: MockCallSource): T | undefined {
  const lastCall = mockFn.mock.calls.at(-1);

  return lastCall ? (lastCall[0] as T) : undefined;
}

function findAuditLogEntry(
  mockFn: MockCallSource,
  action: string,
): AuditLogEntry | undefined {
  return (mockFn.mock.calls as [AuditLogEntry][]).find(
    ([entry]) => entry.action === action,
  )?.[0];
}

function createSnapshotRow(
  overrides?: Partial<{
    uuid: string;
    revision: number;
    requirementsSnapshot: unknown[];
    attachmentsMetadata: unknown[];
    applicationDataSnapshot: Record<string, unknown>;
  }>,
) {
  return {
    uuid: overrides?.uuid ?? SNAPSHOT_UUID,
    revision: overrides?.revision ?? 3,
    requirementsSnapshot: overrides?.requirementsSnapshot ?? [],
    attachmentsMetadata: overrides?.attachmentsMetadata ?? [],
    applicationDataSnapshot: overrides?.applicationDataSnapshot ?? {},
  };
}

function createMembershipRow(role: CommissionRole = CommissionRole.CHAIRMAN) {
  return {
    commissionUuid: COMMISSION_UUID,
    userUuid: USER_UUID,
    role,
    commission: {
      name: 'Komisja Instruktorska',
      type: CommissionType.INSTRUCTOR,
    },
  };
}

function createAuthor() {
  return {
    uuid: USER_UUID,
    firstName: 'Jan',
    surname: 'Boczek',
    email: 'jan@example.com',
  };
}

function createRevisionRequestRow(
  status: InstructorReviewRevisionRequestStatus,
  annotations: Array<{
    uuid: string;
    anchorType:
      | 'FIELD'
      | 'APPLICATION'
      | 'SECTION'
      | 'REQUIREMENT'
      | 'ATTACHMENT';
    anchorKey: string;
    body: string;
    status: InstructorReviewCandidateAnnotationStatus;
  }>,
) {
  const author = createAuthor();
  const isPublishedRequest =
    status === InstructorReviewRevisionRequestStatus.PUBLISHED ||
    status === InstructorReviewRevisionRequestStatus.RESOLVED;
  const isResolvedRequest =
    status === InstructorReviewRevisionRequestStatus.RESOLVED;

  return {
    uuid: REVISION_REQUEST_UUID,
    status,
    summaryMessage: 'Popraw wskazane miejsca.',
    baselineSnapshot: null,
    responseSnapshot: null,
    createdAt: new Date('2026-03-10T11:00:00.000Z'),
    updatedAt: new Date('2026-03-10T11:10:00.000Z'),
    publishedAt: isPublishedRequest
      ? new Date('2026-03-10T11:10:00.000Z')
      : null,
    resolvedAt: isResolvedRequest ? new Date('2026-03-10T12:00:00.000Z') : null,
    createdBy: author,
    updatedBy: author,
    publishedBy: isPublishedRequest ? author : null,
    resolvedBy: isResolvedRequest ? author : null,
    annotations: annotations.map((annotation) => ({
      ...annotation,
      createdAt: new Date('2026-03-10T11:01:00.000Z'),
      updatedAt: new Date('2026-03-10T11:02:00.000Z'),
      publishedAt:
        annotation.status ===
        InstructorReviewCandidateAnnotationStatus.PUBLISHED
          ? new Date('2026-03-10T11:10:00.000Z')
          : null,
      resolvedAt: null,
      createdBy: author,
    })),
  };
}

function createPrismaMock() {
  const tx = {
    instructorApplication: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    instructorReviewInternalNote: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    instructorReviewRevisionRequest: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    instructorApplicationSnapshot: {
      findFirst: jest.fn().mockResolvedValue({ uuid: SNAPSHOT_UUID }),
    },
    instructorReviewCandidateAnnotation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    instructorApplicationRequirement: {
      findUnique: jest.fn(),
    },
    attachment: {
      findFirst: jest.fn(),
    },
    auditEvent: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    commissionMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };

  const prisma = {
    commissionMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    instructorApplication: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    instructorReviewInternalNote: {
      findMany: jest.fn(),
    },
    instructorReviewRevisionRequest: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    instructorApplicationSnapshot: {
      findFirst: jest.fn(),
    },
    instructorReviewCandidateAnnotation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    attachment: {
      findFirst: jest.fn(),
    },
    auditEvent: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(
      async (
        callbackOrOperations:
          | ((client: typeof tx) => Promise<unknown>)
          | unknown[],
      ): Promise<unknown> => {
        if (typeof callbackOrOperations === 'function') {
          return callbackOrOperations(tx);
        }

        return Promise.all(callbackOrOperations);
      },
    ),
  };

  return { prisma, tx };
}

function createAuditServiceMock() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
  };
}

function createStorageServiceMock() {
  return {
    presignDownload: jest.fn(),
  };
}

function createService() {
  const { prisma, tx } = createPrismaMock();
  const storage = createStorageServiceMock();
  const auditService = createAuditServiceMock();
  const changeAuditService = {
    buildResolvedRevisionRequestAudit: jest.fn(),
  };
  const service = new CommissionReviewService(
    prisma as unknown as ConstructorParameters<
      typeof CommissionReviewService
    >[0],
    storage as unknown as ConstructorParameters<
      typeof CommissionReviewService
    >[1],
    auditService as unknown as ConstructorParameters<
      typeof CommissionReviewService
    >[2],
    changeAuditService as unknown as ConstructorParameters<
      typeof CommissionReviewService
    >[3],
  );

  return { service, prisma, tx, storage, auditService, changeAuditService };
}

describe('CommissionReviewService', () => {
  it('saves a revision request draft and logs the revision-request audit action', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue(null);
    tx.instructorReviewRevisionRequest.create.mockResolvedValue(
      createRevisionRequestRow(InstructorReviewRevisionRequestStatus.DRAFT, []),
    );

    const result = await service.saveRevisionRequestDraft(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      {
        summaryMessage: 'Doprecyzuj plan i wskaż brakujące elementy.',
      },
      'req-draft',
    );

    expect(result).toMatchObject({
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        status: InstructorReviewRevisionRequestStatus.DRAFT,
      },
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_REVISION_REQUEST_DRAFT_SAVED',
        targetUuid: REVISION_REQUEST_UUID,
        requestId: 'req-draft',
      }),
    );
  });

  it('blocks creating a candidate annotation when the application is not under review', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.ARCHIVED,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });

    await expectRejectsWithCode(
      service.createCandidateAnnotation(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          anchorType: 'APPLICATION',
          anchorKey: APPLICATION_UUID,
          body: 'Takiej uwagi nie powinno dać się dodać.',
        },
        'req-annotation-archived',
      ),
      'REVISION_REQUEST_DRAFT_NOT_ALLOWED',
    );
  });

  it('blocks creating a candidate annotation for a section anchor', async () => {
    const { service, prisma } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );

    await expectRejectsWithCode(
      service.createCandidateAnnotation(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          anchorType: 'SECTION',
          anchorKey: 'SERVICE_HISTORY',
          body: 'Sekcyjna uwaga nie powinna już przechodzić.',
        } as Parameters<typeof service.createCandidateAnnotation>[3],
        'req-annotation-section',
      ),
      'CANDIDATE_ANNOTATION_SECTION_NOT_ALLOWED',
    );
  });

  it('blocks creating an internal note when the application is not under review', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.ARCHIVED,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });

    await expectRejectsWithCode(
      service.createInternalNote(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          anchorType: 'APPLICATION',
          anchorKey: APPLICATION_UUID,
          body: 'Takiej notatki nie powinno dać się dodać.',
        },
        'req-note-archived',
      ),
      'COMMISSION_INTERNAL_NOTE_NOT_ALLOWED',
    );
  });

  it('publishes a draft revision request and moves the application to TO_FIX', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
      status: InstructorReviewRevisionRequestStatus.DRAFT,
      summaryMessage: 'Popraw wskazane miejsca.',
      annotations: [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'FIELD',
          anchorKey: 'plannedFinishAt',
          status: InstructorReviewCandidateAnnotationStatus.DRAFT,
        },
      ],
    });
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({
      count: 1,
    });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue(
      createRevisionRequestRow(
        InstructorReviewRevisionRequestStatus.PUBLISHED,
        [
          {
            uuid: ANNOTATION_UUID,
            anchorType: 'FIELD',
            anchorKey: 'plannedFinishAt',
            body: 'Doprecyzuj termin.',
            status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
          },
        ],
      ),
    );
    tx.instructorApplication.update.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.TO_FIX,
      updatedAt: new Date('2026-03-10T11:15:00.000Z'),
    });

    const result = await service.publishRevisionRequest(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      {
        summaryMessage: 'Popraw wskazane miejsca.',
      },
      'req-publish',
    );

    const publishAnnotationsCall = getLastMockArg<{
      where: {
        revisionRequestUuid: string;
        status: InstructorReviewCandidateAnnotationStatus;
      };
      data: Record<string, unknown>;
    }>(tx.instructorReviewCandidateAnnotation.updateMany);
    expect(publishAnnotationsCall).toMatchObject({
      where: {
        revisionRequestUuid: REVISION_REQUEST_UUID,
        status: InstructorReviewCandidateAnnotationStatus.DRAFT,
      },
      data: {
        status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
        publishedByUuid: USER_UUID,
        updatedByUuid: USER_UUID,
      },
    });
    const applicationUpdateCall = getLastMockArg<{
      where: { uuid: string };
      select: {
        uuid: boolean;
        status: boolean;
        updatedAt: boolean;
      };
      data: Record<string, unknown>;
    }>(tx.instructorApplication.update);
    expect(applicationUpdateCall).toMatchObject({
      where: { uuid: APPLICATION_UUID },
      select: {
        uuid: true,
        status: true,
        updatedAt: true,
      },
      data: {
        status: ApplicationStatus.TO_FIX,
      },
    });
    expect(result).toMatchObject({
      applicationStatus: ApplicationStatus.TO_FIX,
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        status: InstructorReviewRevisionRequestStatus.PUBLISHED,
      },
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_REVISION_REQUEST_PUBLISHED',
        requestId: 'req-publish',
      }),
    );
    expect(
      findAuditLogEntry(auditService.log, 'COMMISSION_REVIEW_STATUS_CHANGED'),
    ).toMatchObject({
      metadata: {
        fromStatus: ApplicationStatus.UNDER_REVIEW,
        toStatus: ApplicationStatus.TO_FIX,
      },
    });
  });

  it('blocks publishing when the draft contains only a regular section annotation', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
      status: InstructorReviewRevisionRequestStatus.DRAFT,
      summaryMessage: 'Popraw wskazane miejsca.',
      annotations: [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'SECTION',
          anchorKey: 'SERVICE_HISTORY',
          status: InstructorReviewCandidateAnnotationStatus.DRAFT,
        },
      ],
    });

    await expectRejectsWithCode(
      service.publishRevisionRequest(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          summaryMessage: 'Popraw wskazane miejsca.',
        },
        'req-publish-section-only',
      ),
      'REVISION_REQUEST_ACTIONABLE_ANNOTATION_REQUIRED',
    );

    expect(
      tx.instructorReviewCandidateAnnotation.updateMany,
    ).not.toHaveBeenCalled();
    expect(tx.instructorApplication.update).not.toHaveBeenCalled();
  });

  it('blocks publishing when no baseline snapshot exists for the application', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
      status: InstructorReviewRevisionRequestStatus.DRAFT,
      summaryMessage: 'Popraw wskazane miejsca.',
      annotations: [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'FIELD',
          anchorKey: 'teamFunction',
          status: InstructorReviewCandidateAnnotationStatus.DRAFT,
        },
      ],
    });
    tx.instructorApplicationSnapshot.findFirst.mockResolvedValue(null);

    await expectRejectsWithCode(
      service.publishRevisionRequest(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          summaryMessage: null,
        },
        'req-publish-without-snapshot',
      ),
      'REVISION_REQUEST_BASELINE_SNAPSHOT_REQUIRED',
    );

    expect(
      tx.instructorReviewCandidateAnnotation.updateMany,
    ).not.toHaveBeenCalled();
    expect(tx.instructorReviewRevisionRequest.update).not.toHaveBeenCalled();
  });

  it('allows secretary to publish a draft revision request', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.SECRETARY),
    );
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
      status: InstructorReviewRevisionRequestStatus.DRAFT,
      summaryMessage: 'Popraw wskazane miejsca.',
      annotations: [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'FIELD',
          anchorKey: 'plannedFinishAt',
          status: InstructorReviewCandidateAnnotationStatus.DRAFT,
        },
      ],
    });
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({
      count: 1,
    });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue(
      createRevisionRequestRow(
        InstructorReviewRevisionRequestStatus.PUBLISHED,
        [
          {
            uuid: ANNOTATION_UUID,
            anchorType: 'FIELD',
            anchorKey: 'plannedFinishAt',
            body: 'Doprecyzuj termin.',
            status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
          },
        ],
      ),
    );
    tx.instructorApplication.update.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.TO_FIX,
      updatedAt: new Date('2026-03-10T11:15:00.000Z'),
    });

    const result = await service.publishRevisionRequest(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      {
        summaryMessage: 'Popraw wskazane miejsca.',
      },
      'req-secretary-publish',
    );

    expect(result).toMatchObject({
      applicationStatus: ApplicationStatus.TO_FIX,
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        status: InstructorReviewRevisionRequestStatus.PUBLISHED,
      },
    });
  });

  it('blocks member from publishing a draft revision request', async () => {
    const { service, prisma } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );

    await expectRejectsWithCode(
      service.publishRevisionRequest(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          summaryMessage: 'Popraw wskazane miejsca.',
        },
        'req-member-publish',
      ),
      'INSUFFICIENT_COMMISSION_ROLE',
    );
  });

  it('cancels a published revision request when rolling TO_FIX back to UNDER_REVIEW', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.TO_FIX,
      updatedAt: new Date('2026-03-10T12:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
      status: InstructorReviewRevisionRequestStatus.PUBLISHED,
      annotations: [],
    });
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({
      count: 1,
    });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
    });
    tx.instructorApplication.update.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T12:30:00.000Z'),
    });

    const result = await service.changeStatus(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      {
        toStatus: ApplicationStatus.UNDER_REVIEW,
      },
      'req-rollback',
    );

    expect(
      tx.instructorReviewCandidateAnnotation.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        revisionRequestUuid: REVISION_REQUEST_UUID,
        status: {
          in: [
            InstructorReviewCandidateAnnotationStatus.DRAFT,
            InstructorReviewCandidateAnnotationStatus.PUBLISHED,
          ],
        },
      },
      data: {
        status: InstructorReviewCandidateAnnotationStatus.CANCELLED,
        updatedByUuid: USER_UUID,
      },
    });
    const revisionRequestUpdateCall = getLastMockArg<{
      where: { uuid: string };
      data: {
        status: InstructorReviewRevisionRequestStatus;
        updatedByUuid: string;
      };
      select: Record<string, unknown>;
    }>(tx.instructorReviewRevisionRequest.update);
    expect(revisionRequestUpdateCall).toMatchObject({
      where: { uuid: REVISION_REQUEST_UUID },
      data: {
        status: InstructorReviewRevisionRequestStatus.CANCELLED,
        updatedByUuid: USER_UUID,
      },
    });
    expect(revisionRequestUpdateCall?.select).toBeDefined();
    expect(result).toMatchObject({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      activeRevisionRequestStatus: null,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_REVISION_REQUEST_CANCELLED',
        targetUuid: REVISION_REQUEST_UUID,
        requestId: 'req-rollback',
      }),
    );
    expect(
      findAuditLogEntry(auditService.log, 'COMMISSION_REVIEW_STATUS_CHANGED'),
    ).toMatchObject({
      metadata: {
        fromStatus: ApplicationStatus.TO_FIX,
        toStatus: ApplicationStatus.UNDER_REVIEW,
        note: null,
      },
    });
  });

  it('cancels a draft candidate annotation', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T13:00:00.000Z'),
    });
    tx.instructorReviewCandidateAnnotation.findFirst.mockResolvedValue({
      uuid: ANNOTATION_UUID,
      status: InstructorReviewCandidateAnnotationStatus.DRAFT,
      anchorType: 'FIELD',
      anchorKey: 'plannedFinishAt',
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        status: InstructorReviewRevisionRequestStatus.DRAFT,
      },
    });
    tx.instructorReviewCandidateAnnotation.update.mockResolvedValue({
      uuid: ANNOTATION_UUID,
      anchorType: 'FIELD',
      anchorKey: 'plannedFinishAt',
      body: 'Doprecyzuj termin.',
      status: InstructorReviewCandidateAnnotationStatus.CANCELLED,
      createdAt: new Date('2026-03-10T13:01:00.000Z'),
      updatedAt: new Date('2026-03-10T13:05:00.000Z'),
      publishedAt: null,
      resolvedAt: null,
      createdBy: createAuthor(),
    });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
    });

    const result = await service.updateCandidateAnnotation(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      ANNOTATION_UUID,
      {
        status: 'CANCELLED',
      },
      'req-annotation-cancel',
    );

    const annotationUpdateCall = getLastMockArg<{
      where: { uuid: string };
      data: {
        status: InstructorReviewCandidateAnnotationStatus;
        updatedByUuid: string;
      };
      select: Record<string, unknown>;
    }>(tx.instructorReviewCandidateAnnotation.update);
    expect(annotationUpdateCall).toMatchObject({
      where: { uuid: ANNOTATION_UUID },
      data: {
        status: InstructorReviewCandidateAnnotationStatus.CANCELLED,
        updatedByUuid: USER_UUID,
      },
    });
    expect(annotationUpdateCall?.select).toBeDefined();
    expect(result).toMatchObject({
      uuid: ANNOTATION_UUID,
      status: InstructorReviewCandidateAnnotationStatus.CANCELLED,
      anchorType: 'FIELD',
      anchorKey: 'plannedFinishAt',
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_CANDIDATE_ANNOTATION_CANCELLED',
        requestId: 'req-annotation-cancel',
      }),
    );
  });

  it('blocks cancelling a draft candidate annotation when the application is not under review', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.ARCHIVED,
      updatedAt: new Date('2026-03-10T13:00:00.000Z'),
    });
    tx.instructorReviewCandidateAnnotation.findFirst.mockResolvedValue({
      uuid: ANNOTATION_UUID,
      status: InstructorReviewCandidateAnnotationStatus.DRAFT,
      createdByUuid: USER_UUID,
      revisionRequestUuid: REVISION_REQUEST_UUID,
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        status: InstructorReviewRevisionRequestStatus.DRAFT,
      },
    });

    await expectRejectsWithCode(
      service.updateCandidateAnnotation(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        ANNOTATION_UUID,
        {
          status: 'CANCELLED',
        },
        'req-annotation-cancel-archived',
      ),
      'REVISION_REQUEST_DRAFT_NOT_ALLOWED',
    );
  });

  it('blocks member from editing another author draft annotation', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T13:00:00.000Z'),
    });
    tx.instructorReviewCandidateAnnotation.findFirst.mockResolvedValue({
      uuid: ANNOTATION_UUID,
      status: InstructorReviewCandidateAnnotationStatus.DRAFT,
      createdByUuid: '77777777-7777-7777-7777-777777777777',
      revisionRequestUuid: REVISION_REQUEST_UUID,
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        status: InstructorReviewRevisionRequestStatus.DRAFT,
      },
    });

    await expectRejectsWithCode(
      service.updateCandidateAnnotation(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        ANNOTATION_UUID,
        {
          body: 'Nowa treść.',
        },
        'req-annotation-forbidden',
      ),
      'CANDIDATE_ANNOTATION_EDIT_FORBIDDEN',
    );
  });

  it('updates an internal note only for its author', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewInternalNote.findFirst.mockResolvedValue({
      uuid: '99999999-9999-9999-9999-999999999999',
      createdByUuid: USER_UUID,
    });
    tx.instructorReviewInternalNote.update.mockResolvedValue({
      uuid: '99999999-9999-9999-9999-999999999999',
      anchorType: 'APPLICATION',
      anchorKey: APPLICATION_UUID,
      body: 'Zmieniona notatka.',
      createdByUuid: USER_UUID,
      createdAt: new Date('2026-03-10T09:00:00.000Z'),
      updatedAt: new Date('2026-03-10T09:30:00.000Z'),
      createdBy: createAuthor(),
    });

    const result = await service.updateInternalNote(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      '99999999-9999-9999-9999-999999999999',
      {
        body: 'Zmieniona notatka.',
      },
      'req-note-update',
    );

    expect(result).toMatchObject({
      uuid: '99999999-9999-9999-9999-999999999999',
      body: 'Zmieniona notatka.',
      author: {
        userUuid: USER_UUID,
      },
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_INTERNAL_NOTE_UPDATED',
        requestId: 'req-note-update',
      }),
    );
  });

  it('blocks deleting an internal note when the application is not under review', async () => {
    const { service, prisma, tx } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.ARCHIVED,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewInternalNote.findFirst.mockResolvedValue({
      uuid: '99999999-9999-9999-9999-999999999999',
      createdByUuid: USER_UUID,
    });

    await expectRejectsWithCode(
      service.deleteInternalNote(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        '99999999-9999-9999-9999-999999999999',
        'req-note-delete-archived',
      ),
      'COMMISSION_INTERNAL_NOTE_NOT_ALLOWED',
    );
  });

  it('allows direct status transition to TO_FIX and publishes draft annotations', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.UNDER_REVIEW,
      updatedAt: new Date('2026-03-10T10:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue({
      uuid: REVISION_REQUEST_UUID,
      status: InstructorReviewRevisionRequestStatus.DRAFT,
      summaryMessage: null,
      annotations: [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'FIELD',
          anchorKey: 'plannedFinishAt',
          status: InstructorReviewCandidateAnnotationStatus.DRAFT,
        },
      ],
    });
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({
      count: 1,
    });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue(
      createRevisionRequestRow(
        InstructorReviewRevisionRequestStatus.PUBLISHED,
        [
          {
            uuid: ANNOTATION_UUID,
            anchorType: 'FIELD',
            anchorKey: 'plannedFinishAt',
            body: 'Doprecyzuj termin.',
            status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
          },
        ],
      ),
    );
    tx.instructorApplication.update.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.TO_FIX,
      updatedAt: new Date('2026-03-10T11:15:00.000Z'),
    });

    const result = await service.changeStatus(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      {
        toStatus: ApplicationStatus.TO_FIX,
      },
      'req-direct-to-fix',
    );

    expect(result).toMatchObject({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.TO_FIX,
      activeRevisionRequestStatus:
        InstructorReviewRevisionRequestStatus.PUBLISHED,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_REVISION_REQUEST_PUBLISHED',
        requestId: 'req-direct-to-fix',
      }),
    );
  });

  it('lists resolved revision request audit summaries with pagination', async () => {
    const { service, prisma } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    prisma.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.TO_FIX,
    });
    prisma.instructorReviewRevisionRequest.count.mockResolvedValue(2);
    prisma.instructorReviewRevisionRequest.findMany.mockResolvedValue([
      {
        uuid: REVISION_REQUEST_UUID,
        summaryMessage: 'Popraw plan działania.',
        publishedAt: new Date('2026-03-10T11:10:00.000Z'),
        resolvedAt: new Date('2026-03-11T08:30:00.000Z'),
        baselineSnapshot: {
          revision: 4,
        },
        responseSnapshot: null,
      },
    ]);

    const result = await service.listResolvedRevisionRequestAudits(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      {
        page: 1,
        pageSize: 5,
      },
    );

    expect(result).toEqual({
      items: [
        {
          revisionRequest: {
            uuid: REVISION_REQUEST_UUID,
            summaryMessage: 'Popraw plan działania.',
            publishedAt: '2026-03-10T11:10:00.000Z',
            resolvedAt: '2026-03-11T08:30:00.000Z',
          },
          auditAvailable: false,
          auditMissingReason: 'RESPONSE_SNAPSHOT_MISSING',
          baselineSnapshotRevision: 4,
          responseSnapshotRevision: null,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 5,
    });
    expect(
      prisma.instructorReviewRevisionRequest.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 5,
      }),
    );
  });

  it('returns resolved revision request audit detail from dedicated endpoint', async () => {
    const { service, prisma, changeAuditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    prisma.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.TO_FIX,
    });
    const revisionRequestRow = {
      ...createRevisionRequestRow(
        InstructorReviewRevisionRequestStatus.RESOLVED,
        [
          {
            uuid: ANNOTATION_UUID,
            anchorType: 'FIELD' as const,
            anchorKey: 'teamFunction',
            body: 'Uzupełnij funkcję.',
            status: InstructorReviewCandidateAnnotationStatus.RESOLVED,
          },
        ],
      ),
      baselineSnapshot: createSnapshotRow({
        uuid: SNAPSHOT_UUID,
        revision: 2,
      }),
      responseSnapshot: createSnapshotRow({
        uuid: '88888888-8888-8888-8888-888888888888',
        revision: 3,
      }),
    };
    const expectedAudit = {
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        summaryMessage: 'Popraw wskazane miejsca.',
        publishedAt: '2026-03-10T11:10:00.000Z',
        resolvedAt: '2026-03-10T12:00:00.000Z',
      },
      auditAvailable: true,
      auditMissingReason: null,
      baselineSnapshotRevision: 2,
      responseSnapshotRevision: 3,
      changedCount: 1,
      unchangedCount: 0,
      notComparableCount: 0,
      annotationAudits: [],
    };
    changeAuditService.buildResolvedRevisionRequestAudit.mockReturnValue(
      expectedAudit,
    );
    prisma.instructorReviewRevisionRequest.findFirst.mockResolvedValue(
      revisionRequestRow,
    );

    const result = await service.getResolvedRevisionRequestAudit(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      REVISION_REQUEST_UUID,
    );

    const buildAuditCall = getLastMockArg<{
      revisionRequest: {
        uuid: string;
        summaryMessage: string | null;
        publishedAt: string | null;
        resolvedAt: string | null;
      };
      annotations: Array<{
        uuid: string;
        status: InstructorReviewCandidateAnnotationStatus;
      }>;
      baselineSnapshot: unknown;
      responseSnapshot: unknown;
    }>(changeAuditService.buildResolvedRevisionRequestAudit);
    expect(buildAuditCall).toMatchObject({
      revisionRequest: {
        uuid: REVISION_REQUEST_UUID,
        summaryMessage: 'Popraw wskazane miejsca.',
        publishedAt: '2026-03-10T11:10:00.000Z',
        resolvedAt: '2026-03-10T12:00:00.000Z',
      },
      annotations: [
        {
          uuid: ANNOTATION_UUID,
          status: InstructorReviewCandidateAnnotationStatus.RESOLVED,
        },
      ],
      baselineSnapshot: revisionRequestRow.baselineSnapshot,
      responseSnapshot: revisionRequestRow.responseSnapshot,
    });
    expect(result).toBe(expectedAudit);
  });

  it('allows overriding workflow status without a note', async () => {
    const { service, prisma, tx, auditService } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(createMembershipRow());
    tx.instructorApplication.findFirst.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.REPORT_SUBMITTED,
      updatedAt: new Date('2026-03-10T14:00:00.000Z'),
    });
    tx.instructorReviewRevisionRequest.findFirst.mockResolvedValue(null);
    tx.instructorApplication.update.mockResolvedValue({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.SUBMITTED,
      updatedAt: new Date('2026-03-10T14:15:00.000Z'),
    });

    const result = await service.changeStatus(
      PRINCIPAL,
      COMMISSION_UUID,
      APPLICATION_UUID,
      {
        toStatus: ApplicationStatus.SUBMITTED,
      },
      'req-status-override',
    );

    const overrideStatusUpdateCall = getLastMockArg<{
      where: { uuid: string };
      select: {
        uuid: boolean;
        status: boolean;
        updatedAt: boolean;
      };
      data: Record<string, unknown>;
    }>(tx.instructorApplication.update);
    expect(overrideStatusUpdateCall).toMatchObject({
      where: { uuid: APPLICATION_UUID },
      select: {
        uuid: true,
        status: true,
        updatedAt: true,
      },
      data: {
        status: ApplicationStatus.SUBMITTED,
        approvedAt: null,
      },
    });
    expect(result).toMatchObject({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.SUBMITTED,
      activeRevisionRequestStatus: null,
    });
    expect(
      findAuditLogEntry(auditService.log, 'COMMISSION_REVIEW_STATUS_CHANGED'),
    ).toMatchObject({
      metadata: {
        note: null,
      },
    });
  });
});
