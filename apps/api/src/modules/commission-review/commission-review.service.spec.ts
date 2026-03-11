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
    anchorType: 'FIELD' | 'APPLICATION' | 'SECTION' | 'REQUIREMENT' | 'ATTACHMENT';
    anchorKey: string;
    body: string;
    status: InstructorReviewCandidateAnnotationStatus;
  }>,
) {
  const author = createAuthor();
  return {
    uuid: REVISION_REQUEST_UUID,
    status,
    summaryMessage: 'Popraw wskazane miejsca.',
    createdAt: new Date('2026-03-10T11:00:00.000Z'),
    updatedAt: new Date('2026-03-10T11:10:00.000Z'),
    publishedAt:
      status === InstructorReviewRevisionRequestStatus.PUBLISHED
        ? new Date('2026-03-10T11:10:00.000Z')
        : null,
    resolvedAt: null,
    createdBy: author,
    updatedBy: author,
    publishedBy:
      status === InstructorReviewRevisionRequestStatus.PUBLISHED ? author : null,
    resolvedBy: null,
    annotations: annotations.map((annotation) => ({
      ...annotation,
      createdAt: new Date('2026-03-10T11:01:00.000Z'),
      updatedAt: new Date('2026-03-10T11:02:00.000Z'),
      publishedAt:
        annotation.status === InstructorReviewCandidateAnnotationStatus.PUBLISHED
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
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
      findFirst: jest.fn(),
      findMany: jest.fn(),
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
  const service = new CommissionReviewService(
    prisma as unknown as ConstructorParameters<typeof CommissionReviewService>[0],
    storage as unknown as ConstructorParameters<typeof CommissionReviewService>[1],
    auditService as unknown as ConstructorParameters<typeof CommissionReviewService>[2],
  );

  return { service, prisma, tx, storage, auditService };
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

    await expect(
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
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REVISION_REQUEST_DRAFT_NOT_ALLOWED',
      }),
    });
  });

  it('blocks creating a candidate annotation for a section anchor', async () => {
    const { service, prisma } = createService();
    prisma.commissionMember.findFirst.mockResolvedValue(
      createMembershipRow(CommissionRole.MEMBER),
    );

    await expect(
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
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CANDIDATE_ANNOTATION_SECTION_NOT_ALLOWED',
      }),
    });
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

    await expect(
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
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'COMMISSION_INTERNAL_NOTE_NOT_ALLOWED',
      }),
    });
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
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({ count: 1 });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue(
      createRevisionRequestRow(InstructorReviewRevisionRequestStatus.PUBLISHED, [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'FIELD',
          anchorKey: 'plannedFinishAt',
          body: 'Doprecyzuj termin.',
          status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
        },
      ]),
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

    expect(tx.instructorReviewCandidateAnnotation.updateMany).toHaveBeenCalledWith({
      where: {
        revisionRequestUuid: REVISION_REQUEST_UUID,
        status: InstructorReviewCandidateAnnotationStatus.DRAFT,
      },
      data: expect.objectContaining({
        status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
        publishedByUuid: USER_UUID,
        updatedByUuid: USER_UUID,
      }),
    });
    expect(tx.instructorApplication.update).toHaveBeenCalledWith({
      where: { uuid: APPLICATION_UUID },
      select: {
        uuid: true,
        status: true,
        updatedAt: true,
      },
      data: expect.objectContaining({
        status: ApplicationStatus.TO_FIX,
      }),
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
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_STATUS_CHANGED',
        metadata: expect.objectContaining({
          fromStatus: ApplicationStatus.UNDER_REVIEW,
          toStatus: ApplicationStatus.TO_FIX,
        }),
      }),
    );
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

    await expect(
      service.publishRevisionRequest(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          summaryMessage: 'Popraw wskazane miejsca.',
        },
        'req-publish-section-only',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REVISION_REQUEST_ACTIONABLE_ANNOTATION_REQUIRED',
      }),
    });

    expect(tx.instructorReviewCandidateAnnotation.updateMany).not.toHaveBeenCalled();
    expect(tx.instructorApplication.update).not.toHaveBeenCalled();
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
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({ count: 1 });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue(
      createRevisionRequestRow(InstructorReviewRevisionRequestStatus.PUBLISHED, [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'FIELD',
          anchorKey: 'plannedFinishAt',
          body: 'Doprecyzuj termin.',
          status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
        },
      ]),
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

    await expect(
      service.publishRevisionRequest(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        {
          summaryMessage: 'Popraw wskazane miejsca.',
        },
        'req-member-publish',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INSUFFICIENT_COMMISSION_ROLE',
      }),
    });
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
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({ count: 1 });
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

    expect(tx.instructorReviewCandidateAnnotation.updateMany).toHaveBeenCalledWith({
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
    expect(tx.instructorReviewRevisionRequest.update).toHaveBeenCalledWith({
      where: { uuid: REVISION_REQUEST_UUID },
      data: {
        status: InstructorReviewRevisionRequestStatus.CANCELLED,
        updatedByUuid: USER_UUID,
      },
      select: expect.any(Object),
    });
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
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_STATUS_CHANGED',
        metadata: expect.objectContaining({
          fromStatus: ApplicationStatus.TO_FIX,
          toStatus: ApplicationStatus.UNDER_REVIEW,
          note: null,
        }),
      }),
    );
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

    expect(tx.instructorReviewCandidateAnnotation.update).toHaveBeenCalledWith({
      where: { uuid: ANNOTATION_UUID },
      data: {
        status: InstructorReviewCandidateAnnotationStatus.CANCELLED,
        updatedByUuid: USER_UUID,
      },
      select: expect.any(Object),
    });
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

    await expect(
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
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'REVISION_REQUEST_DRAFT_NOT_ALLOWED',
      }),
    });
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

    await expect(
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
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'CANDIDATE_ANNOTATION_EDIT_FORBIDDEN',
      }),
    });
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

    await expect(
      service.deleteInternalNote(
        PRINCIPAL,
        COMMISSION_UUID,
        APPLICATION_UUID,
        '99999999-9999-9999-9999-999999999999',
        'req-note-delete-archived',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'COMMISSION_INTERNAL_NOTE_NOT_ALLOWED',
      }),
    });
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
    tx.instructorReviewCandidateAnnotation.updateMany.mockResolvedValue({ count: 1 });
    tx.instructorReviewRevisionRequest.update.mockResolvedValue(
      createRevisionRequestRow(InstructorReviewRevisionRequestStatus.PUBLISHED, [
        {
          uuid: ANNOTATION_UUID,
          anchorType: 'FIELD',
          anchorKey: 'plannedFinishAt',
          body: 'Doprecyzuj termin.',
          status: InstructorReviewCandidateAnnotationStatus.PUBLISHED,
        },
      ]),
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

    expect(tx.instructorApplication.update).toHaveBeenCalledWith({
      where: { uuid: APPLICATION_UUID },
      select: {
        uuid: true,
        status: true,
        updatedAt: true,
      },
      data: expect.objectContaining({
        status: ApplicationStatus.SUBMITTED,
        approvedAt: null,
      }),
    });
    expect(result).toMatchObject({
      uuid: APPLICATION_UUID,
      status: ApplicationStatus.SUBMITTED,
      activeRevisionRequestStatus: null,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COMMISSION_REVIEW_STATUS_CHANGED',
        metadata: expect.objectContaining({
          note: null,
        }),
      }),
    );
  });
});
