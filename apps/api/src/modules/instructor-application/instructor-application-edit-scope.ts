// @file: apps/api/src/modules/instructor-application/instructor-application-edit-scope.ts
import {
  ApplicationStatus,
  InstructorFixRequestStatus,
  Prisma,
} from '@hss/database';
import {
  EDITABLE_INSTRUCTOR_APPLICATION_FIELDS,
  type EditableInstructorApplicationField,
  type InstructorApplicationCandidateEditScope,
  type InstructorReviewCandidateAnnotationPublic,
  type InstructorReviewSectionKey,
} from '@hss/schemas';

const SECTION_FIELD_SCOPE_MAP: Record<
  InstructorReviewSectionKey,
  EditableInstructorApplicationField[]
> = {
  // Regular section comments are informational. Candidate write access should be
  // unlocked only by explicit field / requirement / attachment annotations.
  BASIC_INFO: [],
  SERVICE_HISTORY: [],
  SUPERVISOR: [],
  GENERAL_ATTACHMENTS: [],
};

export const PUBLISHED_REVISION_REQUEST_SCOPE_SELECT = {
  uuid: true,
  summaryMessage: true,
  publishedAt: true,
  candidateFirstViewedAt: true,
  candidateFirstEditedAt: true,
  candidateLastActivityAt: true,
  annotations: {
    where: {
      status: 'PUBLISHED',
    },
    orderBy: [{ createdAt: 'asc' }, { uuid: 'asc' }],
    select: {
      uuid: true,
      anchorType: true,
      anchorKey: true,
      body: true,
      publishedAt: true,
    },
  },
} satisfies Prisma.InstructorReviewRevisionRequestSelect;

export type PublishedRevisionRequestScopeRow =
  Prisma.InstructorReviewRevisionRequestGetPayload<{
    select: typeof PUBLISHED_REVISION_REQUEST_SCOPE_SELECT;
  }>;

export const PUBLISHED_FIX_REQUEST_SCOPE_SELECT = {
  uuid: true,
  message: true,
  publishedAt: true,
  editableApplicationFields: true,
  editableRequirementUuids: true,
  allowTopLevelAttachments: true,
} satisfies Prisma.InstructorApplicationFixRequestSelect;

export type PublishedFixRequestScopeRow =
  Prisma.InstructorApplicationFixRequestGetPayload<{
    select: typeof PUBLISHED_FIX_REQUEST_SCOPE_SELECT;
  }>;

type AttachmentRequirementOwner = {
  uuid: string;
  instructorRequirementUuid?: string | null;
};

function isEditableInstructorApplicationField(
  value: string,
): value is EditableInstructorApplicationField {
  return (EDITABLE_INSTRUCTOR_APPLICATION_FIELDS as readonly string[]).includes(
    value,
  );
}

function isInstructorReviewSectionKey(
  value: string,
): value is InstructorReviewSectionKey {
  return Object.prototype.hasOwnProperty.call(SECTION_FIELD_SCOPE_MAP, value);
}

export function sanitizeEditableInstructorApplicationFields(
  values: readonly string[],
): EditableInstructorApplicationField[] {
  return values.filter(isEditableInstructorApplicationField);
}

export function buildAttachmentRequirementMap(
  attachments: readonly AttachmentRequirementOwner[],
): ReadonlyMap<string, string | null> {
  return new Map(
    attachments.map((attachment) => [
      attachment.uuid,
      attachment.instructorRequirementUuid ?? null,
    ]),
  );
}

function toPublicAnnotation(
  annotation: PublishedRevisionRequestScopeRow['annotations'][number],
): InstructorReviewCandidateAnnotationPublic {
  return {
    uuid: annotation.uuid,
    anchorType: annotation.anchorType,
    anchorKey: annotation.anchorKey,
    body: annotation.body,
    publishedAt: annotation.publishedAt?.toISOString() ?? null,
  };
}

export function buildInstructorApplicationCandidateEditScope(
  status: ApplicationStatus | null | undefined,
  publishedRevisionRequest:
    | PublishedRevisionRequestScopeRow
    | null
    | undefined,
  legacyPublishedFixRequest:
    | PublishedFixRequestScopeRow
    | null
    | undefined = null,
  attachmentRequirementByUuid: ReadonlyMap<string, string | null> = new Map(),
  hufcowyPresenceAttachmentUuid: string | null = null,
): InstructorApplicationCandidateEditScope {
  if (status === ApplicationStatus.DRAFT) {
    return {
      mode: 'FULL',
      requestUuid: null,
      candidateMessage: null,
      publishedAt: null,
      candidateFirstViewedAt: null,
      candidateFirstEditedAt: null,
      candidateLastActivityAt: null,
      editableApplicationFields: [],
      editableRequirementUuids: [],
      editableRequirementAttachmentUuids: [],
      allowTopLevelAttachments: true,
      allowHufcowyPresenceAttachment: true,
      annotations: [],
    };
  }

  if (
    status !== ApplicationStatus.TO_FIX ||
    (!publishedRevisionRequest || !publishedRevisionRequest.publishedAt)
  ) {
    if (legacyPublishedFixRequest?.publishedAt) {
      return {
        mode: 'LIMITED',
        requestUuid: legacyPublishedFixRequest.uuid,
        candidateMessage: legacyPublishedFixRequest.message ?? null,
        publishedAt: legacyPublishedFixRequest.publishedAt.toISOString(),
        candidateFirstViewedAt: null,
        candidateFirstEditedAt: null,
        candidateLastActivityAt: null,
        editableApplicationFields: sanitizeEditableInstructorApplicationFields(
          legacyPublishedFixRequest.editableApplicationFields,
        ),
        editableRequirementUuids:
          legacyPublishedFixRequest.editableRequirementUuids,
        editableRequirementAttachmentUuids:
          legacyPublishedFixRequest.editableRequirementUuids,
        allowTopLevelAttachments:
          legacyPublishedFixRequest.allowTopLevelAttachments,
        allowHufcowyPresenceAttachment:
          sanitizeEditableInstructorApplicationFields(
            legacyPublishedFixRequest.editableApplicationFields,
          ).includes('hufcowyPresence'),
        annotations: [],
      };
    }

    return {
      mode: 'NONE',
      requestUuid: null,
      candidateMessage: null,
      publishedAt: null,
      candidateFirstViewedAt: null,
      candidateFirstEditedAt: null,
      candidateLastActivityAt: null,
      editableApplicationFields: [],
      editableRequirementUuids: [],
      editableRequirementAttachmentUuids: [],
      allowTopLevelAttachments: false,
      allowHufcowyPresenceAttachment: false,
      annotations: [],
    };
  }

  const editableFields = new Set<EditableInstructorApplicationField>();
  const editableRequirementUuids = new Set<string>();
  const editableRequirementAttachmentUuids = new Set<string>();
  let allowTopLevelAttachments = false;
  let allowHufcowyPresenceAttachment = false;

  for (const annotation of publishedRevisionRequest.annotations) {
    switch (annotation.anchorType) {
      case 'FIELD': {
        if (isEditableInstructorApplicationField(annotation.anchorKey)) {
          editableFields.add(annotation.anchorKey);
          if (annotation.anchorKey === 'hufcowyPresence') {
            allowHufcowyPresenceAttachment = true;
          }
        }
        break;
      }
      case 'SECTION': {
        if (!isInstructorReviewSectionKey(annotation.anchorKey)) {
          break;
        }

        for (const field of SECTION_FIELD_SCOPE_MAP[annotation.anchorKey]) {
          editableFields.add(field);
        }
        if (annotation.anchorKey === 'GENERAL_ATTACHMENTS') {
          allowTopLevelAttachments = true;
        }
        break;
      }
      case 'REQUIREMENT': {
        editableRequirementUuids.add(annotation.anchorKey);
        break;
      }
      case 'ATTACHMENT': {
        if (
          hufcowyPresenceAttachmentUuid &&
          annotation.anchorKey === hufcowyPresenceAttachmentUuid
        ) {
          allowHufcowyPresenceAttachment = true;
          break;
        }

        const requirementUuid =
          attachmentRequirementByUuid.get(annotation.anchorKey) ?? null;

        if (requirementUuid) {
          editableRequirementAttachmentUuids.add(requirementUuid);
        } else {
          allowTopLevelAttachments = true;
        }
        break;
      }
      case 'APPLICATION':
      default:
        break;
    }
  }

  return {
    mode: 'LIMITED',
    requestUuid: publishedRevisionRequest.uuid,
    candidateMessage: publishedRevisionRequest.summaryMessage ?? null,
    publishedAt: publishedRevisionRequest.publishedAt.toISOString(),
    candidateFirstViewedAt:
      publishedRevisionRequest.candidateFirstViewedAt?.toISOString() ?? null,
    candidateFirstEditedAt:
      publishedRevisionRequest.candidateFirstEditedAt?.toISOString() ?? null,
    candidateLastActivityAt:
      publishedRevisionRequest.candidateLastActivityAt?.toISOString() ?? null,
    editableApplicationFields: [...editableFields],
    editableRequirementUuids: [...editableRequirementUuids],
    editableRequirementAttachmentUuids: [...editableRequirementAttachmentUuids],
    allowTopLevelAttachments,
    allowHufcowyPresenceAttachment,
    annotations: publishedRevisionRequest.annotations.map(toPublicAnnotation),
  };
}
