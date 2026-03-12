// @file: apps/api/src/modules/commission-review/commission-review-change-audit.service.spec.ts
import type { CommissionReviewRevisionRequest } from '@hss/schemas';
import { CommissionReviewChangeAuditService } from './commission-review-change-audit.service';

const ANNOTATION_AUTHOR = {
  userUuid: '11111111-1111-1111-1111-111111111111',
  firstName: 'Jan',
  surname: 'Boczek',
  email: 'jan@example.com',
};

function createRevisionRequest(
  overrides?: Partial<CommissionReviewRevisionRequest>,
): CommissionReviewRevisionRequest {
  return {
    uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    status: 'RESOLVED',
    summaryMessage: 'Popraw wskazane elementy.',
    createdAt: '2026-03-11T10:00:00.000Z',
    updatedAt: '2026-03-11T10:05:00.000Z',
    publishedAt: '2026-03-11T10:05:00.000Z',
    candidateFirstViewedAt: '2026-03-11T10:06:00.000Z',
    candidateFirstEditedAt: '2026-03-11T10:07:00.000Z',
    candidateLastActivityAt: '2026-03-11T10:10:00.000Z',
    resolvedAt: '2026-03-11T10:15:00.000Z',
    createdBy: ANNOTATION_AUTHOR,
    updatedBy: ANNOTATION_AUTHOR,
    publishedBy: ANNOTATION_AUTHOR,
    resolvedBy: ANNOTATION_AUTHOR,
    annotations: [],
    ...overrides,
  };
}

function createSnapshot(
  overrides?: Partial<{
    uuid: string;
    revision: number;
    candidateSnapshot: Record<string, unknown>;
    requirementsSnapshot: unknown[];
    attachmentsMetadata: unknown[];
    applicationDataSnapshot: Record<string, unknown>;
  }>,
) {
  return {
    uuid: overrides?.uuid ?? 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    revision: overrides?.revision ?? 1,
    candidateSnapshot: overrides?.candidateSnapshot ?? {},
    requirementsSnapshot: overrides?.requirementsSnapshot ?? [],
    attachmentsMetadata: overrides?.attachmentsMetadata ?? [],
    applicationDataSnapshot: overrides?.applicationDataSnapshot ?? {},
  };
}

describe('CommissionReviewChangeAuditService', () => {
  const service = new CommissionReviewChangeAuditService();

  it('returns CHANGED for edited field annotation', () => {
    const revisionRequest = createRevisionRequest({
      annotations: [
        {
          uuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          anchorType: 'FIELD',
          anchorKey: 'teamFunction',
          body: 'Doprecyzuj funkcję w drużynie.',
          status: 'RESOLVED',
          createdAt: '2026-03-11T10:01:00.000Z',
          updatedAt: '2026-03-11T10:02:00.000Z',
          publishedAt: '2026-03-11T10:05:00.000Z',
          resolvedAt: '2026-03-11T10:15:00.000Z',
          author: ANNOTATION_AUTHOR,
        },
      ],
    });
    const baselineSnapshot = createSnapshot({
      applicationDataSnapshot: {
        teamFunction: 'Drużynowy',
      },
    });
    const responseSnapshot = createSnapshot({
      uuid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      revision: 2,
      applicationDataSnapshot: {
        teamFunction: 'Szczepowy',
      },
    });

    const result = service.buildResolvedRevisionRequestAudit({
      revisionRequest,
      baselineSnapshot,
      responseSnapshot,
    });

    expect(result.auditAvailable).toBe(true);
    expect(result.changedCount).toBe(1);
    expect(result.annotationAudits[0]).toMatchObject({
      comparisonStatus: 'CHANGED',
      changes: [
        {
          key: 'teamFunction',
          changed: true,
          before: { kind: 'TEXT', text: 'Drużynowy' },
          after: { kind: 'TEXT', text: 'Szczepowy' },
        },
      ],
    });
  });

  it('compares attachment annotation by owner slot, not by old attachment uuid', () => {
    const revisionRequest = createRevisionRequest({
      annotations: [
        {
          uuid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          anchorType: 'ATTACHMENT',
          anchorKey: 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1',
          body: 'Wgraj poprawiony załącznik do zadania.',
          status: 'RESOLVED',
          createdAt: '2026-03-11T10:01:00.000Z',
          updatedAt: '2026-03-11T10:02:00.000Z',
          publishedAt: '2026-03-11T10:05:00.000Z',
          resolvedAt: '2026-03-11T10:15:00.000Z',
          author: ANNOTATION_AUTHOR,
        },
      ],
    });
    const baselineSnapshot = createSnapshot({
      requirementsSnapshot: [
        {
          uuid: '99999999-9999-9999-9999-999999999999',
          code: '2C',
          description: 'Prowadzić formację drużynowych',
          state: 'DONE',
          actionDescription: 'Było wykonane',
          verificationText: 'Stary opis',
        },
      ],
      attachmentsMetadata: [
        {
          uuid: 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1',
          objectKey: 'old-key',
          originalFilename: 'stary.pdf',
          contentType: 'application/pdf',
          sizeBytes: 100,
          checksum: 'old-sum',
          instructorRequirementUuid: '99999999-9999-9999-9999-999999999999',
          isHufcowyPresence: false,
        },
      ],
    });
    const responseSnapshot = createSnapshot({
      uuid: 'abababab-abab-abab-abab-abababababab',
      revision: 2,
      requirementsSnapshot: baselineSnapshot.requirementsSnapshot,
      attachmentsMetadata: [
        {
          uuid: 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2',
          objectKey: 'new-key',
          originalFilename: 'nowy.pdf',
          contentType: 'application/pdf',
          sizeBytes: 120,
          checksum: 'new-sum',
          instructorRequirementUuid: '99999999-9999-9999-9999-999999999999',
          isHufcowyPresence: false,
        },
      ],
    });

    const result = service.buildResolvedRevisionRequestAudit({
      revisionRequest,
      baselineSnapshot,
      responseSnapshot,
    });

    expect(result.annotationAudits[0]).toMatchObject({
      anchorLabel: 'stary.pdf',
      comparisonStatus: 'CHANGED',
      changes: [
        {
          key: 'attachments',
          changed: true,
          before: {
            kind: 'ATTACHMENT_SET',
            items: [
              expect.objectContaining({
                originalFilename: 'stary.pdf',
              }),
            ],
          },
          after: {
            kind: 'ATTACHMENT_SET',
            items: [
              expect.objectContaining({
                originalFilename: 'nowy.pdf',
              }),
            ],
          },
        },
      ],
    });
  });

  it('marks audit as unavailable when response snapshot is missing', () => {
    const revisionRequest = createRevisionRequest({
      annotations: [
        {
          uuid: 'ababcccc-cccc-cccc-cccc-cccccccccccc',
          anchorType: 'FIELD',
          anchorKey: 'plannedFinishAt',
          body: 'Zaktualizuj termin.',
          status: 'RESOLVED',
          createdAt: '2026-03-11T10:01:00.000Z',
          updatedAt: '2026-03-11T10:02:00.000Z',
          publishedAt: '2026-03-11T10:05:00.000Z',
          resolvedAt: '2026-03-11T10:15:00.000Z',
          author: ANNOTATION_AUTHOR,
        },
      ],
    });

    const result = service.buildResolvedRevisionRequestAudit({
      revisionRequest,
      baselineSnapshot: createSnapshot({
        applicationDataSnapshot: {
          plannedFinishAt: '2026-03-11',
        },
      }),
      responseSnapshot: null,
    });

    expect(result).toMatchObject({
      auditAvailable: false,
      auditMissingReason: 'RESPONSE_SNAPSHOT_MISSING',
      notComparableCount: 1,
    });
    expect(result.annotationAudits[0]?.comparisonStatus).toBe('NOT_COMPARABLE');
  });
});
