// @file: apps/api/src/modules/instructor-application/instructor-application-edit-scope.spec.ts
import { ApplicationStatus } from '@hss/database';
import {
  buildAttachmentRequirementMap,
  buildInstructorApplicationCandidateEditScope,
  type PublishedRevisionRequestScopeRow,
} from './instructor-application-edit-scope';

function createPublishedRevisionRequest(
  annotations: PublishedRevisionRequestScopeRow['annotations'],
): PublishedRevisionRequestScopeRow {
  return {
    uuid: 'revision-request-1',
    summaryMessage: null,
    publishedAt: new Date('2026-03-11T10:00:00.000Z'),
    candidateFirstViewedAt: null,
    candidateFirstEditedAt: null,
    candidateLastActivityAt: null,
    annotations,
  };
}

describe('buildInstructorApplicationCandidateEditScope', () => {
  it('unlocks requirement attachments without unlocking requirement text when annotation targets a requirement attachment', () => {
    const scope = buildInstructorApplicationCandidateEditScope(
      ApplicationStatus.TO_FIX,
      createPublishedRevisionRequest([
        {
          uuid: 'annotation-1',
          anchorType: 'ATTACHMENT',
          anchorKey: 'attachment-1',
          body: 'Dodaj poprawiony plik.',
          publishedAt: new Date('2026-03-11T10:00:00.000Z'),
        },
      ]),
      null,
      buildAttachmentRequirementMap([
        {
          uuid: 'attachment-1',
          instructorRequirementUuid: 'requirement-1',
        },
      ]),
    );

    expect(scope.allowTopLevelAttachments).toBe(false);
    expect(scope.editableRequirementUuids).toEqual([]);
    expect(scope.editableRequirementAttachmentUuids).toEqual(['requirement-1']);
  });

  it('keeps top-level attachments editable when annotation targets a general attachment', () => {
    const scope = buildInstructorApplicationCandidateEditScope(
      ApplicationStatus.TO_FIX,
      createPublishedRevisionRequest([
        {
          uuid: 'annotation-2',
          anchorType: 'ATTACHMENT',
          anchorKey: 'attachment-2',
          body: 'Podmień załącznik ogólny.',
          publishedAt: new Date('2026-03-11T10:00:00.000Z'),
        },
      ]),
      null,
      buildAttachmentRequirementMap([
        {
          uuid: 'attachment-2',
          instructorRequirementUuid: null,
        },
      ]),
    );

    expect(scope.allowTopLevelAttachments).toBe(true);
    expect(scope.editableRequirementUuids).toEqual([]);
    expect(scope.editableRequirementAttachmentUuids).toEqual([]);
  });

  it('does not unlock unrelated application fields when annotation targets a regular section', () => {
    const scope = buildInstructorApplicationCandidateEditScope(
      ApplicationStatus.TO_FIX,
      createPublishedRevisionRequest([
        {
          uuid: 'annotation-3',
          anchorType: 'SECTION',
          anchorKey: 'SERVICE_HISTORY',
          body: 'Doprecyzuj odpowiednie miejsca w tej sekcji.',
          publishedAt: new Date('2026-03-11T10:00:00.000Z'),
        },
      ]),
    );

    expect(scope.editableApplicationFields).toEqual([]);
    expect(scope.allowTopLevelAttachments).toBe(false);
  });

  it('keeps general attachments editable when annotation targets the general attachments section', () => {
    const scope = buildInstructorApplicationCandidateEditScope(
      ApplicationStatus.TO_FIX,
      createPublishedRevisionRequest([
        {
          uuid: 'annotation-4',
          anchorType: 'SECTION',
          anchorKey: 'GENERAL_ATTACHMENTS',
          body: 'Podmień załączniki ogólne.',
          publishedAt: new Date('2026-03-11T10:00:00.000Z'),
        },
      ]),
    );

    expect(scope.allowTopLevelAttachments).toBe(true);
    expect(scope.editableApplicationFields).toEqual([]);
  });

  it('unlocks district leader opinion attachment without unlocking the presence field', () => {
    const scope = buildInstructorApplicationCandidateEditScope(
      ApplicationStatus.TO_FIX,
      createPublishedRevisionRequest([
        {
          uuid: 'annotation-5',
          anchorType: 'ATTACHMENT',
          anchorKey: 'attachment-hufcowy-1',
          body: 'Podmień opinię hufcowego.',
          publishedAt: new Date('2026-03-11T10:00:00.000Z'),
        },
      ]),
      null,
      buildAttachmentRequirementMap([
        {
          uuid: 'attachment-hufcowy-1',
          instructorRequirementUuid: null,
        },
      ]),
      'attachment-hufcowy-1',
    );

    expect(scope.editableApplicationFields).toEqual([]);
    expect(scope.allowTopLevelAttachments).toBe(false);
    expect(scope.allowHufcowyPresenceAttachment).toBe(true);
  });
});
