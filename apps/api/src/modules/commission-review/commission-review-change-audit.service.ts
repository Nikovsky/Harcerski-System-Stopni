// @file: apps/api/src/modules/commission-review/commission-review-change-audit.service.ts
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@hss/database';
import type {
  CommissionReviewCandidateAnnotation,
  CommissionReviewResolvedRevisionRequestMetadata,
  CommissionReviewResolvedAnnotationAudit,
  CommissionReviewResolvedAnnotationChange,
  CommissionReviewResolvedChangeValue,
  CommissionReviewResolvedRevisionRequest,
  EditableInstructorApplicationField,
} from '@hss/schemas';

type SnapshotInput = {
  uuid: string;
  revision: number;
  requirementsSnapshot: Prisma.JsonValue;
  attachmentsMetadata: Prisma.JsonValue;
  applicationDataSnapshot: Prisma.JsonValue;
};

type NormalizedRequirementSnapshot = {
  uuid: string;
  code: string | null;
  description: string | null;
  state: string | null;
  actionDescription: string | null;
  verificationText: string | null;
  availableKeys: Set<string>;
};

type NormalizedAttachmentSnapshot = {
  uuid: string;
  objectKey: string | null;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  checksum: string | null;
  requirementUuid: string | null;
  isHufcowyPresence: boolean;
  hasRequirementUuidKey: boolean;
  hasHufcowyPresenceKey: boolean;
};

type NormalizedSnapshot = {
  revision: number;
  applicationFields: Map<EditableInstructorApplicationField, string | null>;
  requirementsByUuid: Map<string, NormalizedRequirementSnapshot>;
  attachments: NormalizedAttachmentSnapshot[];
  attachmentsByUuid: Map<string, NormalizedAttachmentSnapshot>;
  attachmentCollectionsByOwner: Map<
    string,
    {
      value: CommissionReviewResolvedChangeValue;
      signature: string;
    }
  >;
};

type AttachmentOwner =
  | { kind: 'GENERAL_ATTACHMENTS' }
  | { kind: 'HUFCOWY_PRESENCE' }
  | { kind: 'REQUIREMENT'; requirementUuid: string };

const SNAPSHOT_FIELD_KEYS = [
  'plannedFinishAt',
  'teamFunction',
  'hufiecFunction',
  'openTrialForRank',
  'openTrialDeadline',
  'hufcowyPresence',
  'functionsHistory',
  'coursesHistory',
  'campsHistory',
  'successes',
  'failures',
  'supervisorFirstName',
  'supervisorSecondName',
  'supervisorSurname',
  'supervisorInstructorRank',
  'supervisorInstructorFunction',
] as const satisfies readonly EditableInstructorApplicationField[];

const DATE_FIELDS = new Set<EditableInstructorApplicationField>([
  'plannedFinishAt',
  'openTrialDeadline',
]);

const ENUM_FIELDS = new Set<string>([
  'openTrialForRank',
  'hufcowyPresence',
  'supervisorInstructorRank',
  'state',
]);

@Injectable()
export class CommissionReviewChangeAuditService {
  buildResolvedRevisionRequestAudit(params: {
    revisionRequest: CommissionReviewResolvedRevisionRequestMetadata;
    annotations: CommissionReviewCandidateAnnotation[];
    baselineSnapshot: SnapshotInput | null;
    responseSnapshot: SnapshotInput | null;
  }): CommissionReviewResolvedRevisionRequest {
    const { revisionRequest, annotations, baselineSnapshot, responseSnapshot } =
      params;

    const missingReason = baselineSnapshot
      ? responseSnapshot
        ? null
        : 'RESPONSE_SNAPSHOT_MISSING'
      : 'BASELINE_SNAPSHOT_MISSING';

    if (!baselineSnapshot || !responseSnapshot) {
      const annotationAudits = annotations.map((annotation) =>
        this.createNotComparableAnnotationAudit(annotation, null),
      );

      return {
        revisionRequest,
        auditAvailable: false,
        auditMissingReason: missingReason,
        baselineSnapshotRevision: baselineSnapshot?.revision ?? null,
        responseSnapshotRevision: responseSnapshot?.revision ?? null,
        changedCount: 0,
        unchangedCount: 0,
        notComparableCount: annotationAudits.length,
        annotationAudits,
      };
    }

    const normalizedBaseline = this.normalizeSnapshot(baselineSnapshot);
    const normalizedResponse = this.normalizeSnapshot(responseSnapshot);
    const annotationAudits = annotations.map((annotation) =>
      this.buildAnnotationAudit(
        annotation,
        normalizedBaseline,
        normalizedResponse,
      ),
    );

    return {
      revisionRequest,
      auditAvailable: true,
      auditMissingReason: null,
      baselineSnapshotRevision: baselineSnapshot.revision,
      responseSnapshotRevision: responseSnapshot.revision,
      changedCount: annotationAudits.filter(
        (audit) => audit.comparisonStatus === 'CHANGED',
      ).length,
      unchangedCount: annotationAudits.filter(
        (audit) => audit.comparisonStatus === 'UNCHANGED',
      ).length,
      notComparableCount: annotationAudits.filter(
        (audit) => audit.comparisonStatus === 'NOT_COMPARABLE',
      ).length,
      annotationAudits,
    };
  }

  private buildAnnotationAudit(
    annotation: CommissionReviewCandidateAnnotation,
    baseline: NormalizedSnapshot,
    response: NormalizedSnapshot,
  ): CommissionReviewResolvedAnnotationAudit {
    switch (annotation.anchorType) {
      case 'FIELD':
        return this.buildFieldAnnotationAudit(annotation, baseline, response);
      case 'REQUIREMENT':
        return this.buildRequirementAnnotationAudit(
          annotation,
          baseline,
          response,
        );
      case 'ATTACHMENT':
        return this.buildAttachmentAnnotationAudit(
          annotation,
          baseline,
          response,
        );
      default:
        return this.createNotComparableAnnotationAudit(annotation, null);
    }
  }

  private buildFieldAnnotationAudit(
    annotation: CommissionReviewCandidateAnnotation,
    baseline: NormalizedSnapshot,
    response: NormalizedSnapshot,
  ): CommissionReviewResolvedAnnotationAudit {
    const fieldKey = annotation.anchorKey as EditableInstructorApplicationField;

    if (
      !baseline.applicationFields.has(fieldKey) ||
      !response.applicationFields.has(fieldKey)
    ) {
      return this.createNotComparableAnnotationAudit(annotation, null);
    }

    const beforeValue = baseline.applicationFields.get(fieldKey) ?? null;
    const afterValue = response.applicationFields.get(fieldKey) ?? null;
    const change = this.createScalarChange(fieldKey, beforeValue, afterValue);

    return {
      annotation,
      anchorLabel: null,
      comparisonStatus: change.changed ? 'CHANGED' : 'UNCHANGED',
      changes: [change],
    };
  }

  private buildRequirementAnnotationAudit(
    annotation: CommissionReviewCandidateAnnotation,
    baseline: NormalizedSnapshot,
    response: NormalizedSnapshot,
  ): CommissionReviewResolvedAnnotationAudit {
    const baselineRequirement =
      baseline.requirementsByUuid.get(annotation.anchorKey) ?? null;
    const responseRequirement =
      response.requirementsByUuid.get(annotation.anchorKey) ?? null;

    if (!baselineRequirement || !responseRequirement) {
      return this.createNotComparableAnnotationAudit(annotation, null);
    }

    if (
      !this.hasRequiredRequirementFields(baselineRequirement) ||
      !this.hasRequiredRequirementFields(responseRequirement)
    ) {
      return this.createNotComparableAnnotationAudit(annotation, null);
    }

    const changes: CommissionReviewResolvedAnnotationChange[] = [
      this.createScalarChange(
        'state',
        baselineRequirement.state,
        responseRequirement.state,
      ),
      this.createScalarChange(
        'actionDescription',
        baselineRequirement.actionDescription,
        responseRequirement.actionDescription,
      ),
      this.createScalarChange(
        'verificationText',
        baselineRequirement.verificationText,
        responseRequirement.verificationText,
      ),
    ];

    return {
      annotation,
      anchorLabel: this.formatRequirementLabel(
        baselineRequirement,
        responseRequirement,
      ),
      comparisonStatus: changes.some((change) => change.changed)
        ? 'CHANGED'
        : 'UNCHANGED',
      changes,
    };
  }

  private buildAttachmentAnnotationAudit(
    annotation: CommissionReviewCandidateAnnotation,
    baseline: NormalizedSnapshot,
    response: NormalizedSnapshot,
  ): CommissionReviewResolvedAnnotationAudit {
    const baselineAttachment =
      baseline.attachmentsByUuid.get(annotation.anchorKey) ?? null;

    if (!baselineAttachment) {
      return this.createNotComparableAnnotationAudit(annotation, null);
    }

    const owner = this.resolveAttachmentOwner(baselineAttachment);

    if (!owner) {
      return this.createNotComparableAnnotationAudit(
        annotation,
        baselineAttachment.originalFilename,
      );
    }

    const beforeCollection = this.getAttachmentCollectionForOwner(
      baseline,
      owner,
    );
    const afterCollection = this.getAttachmentCollectionForOwner(
      response,
      owner,
    );
    const changed = beforeCollection.signature !== afterCollection.signature;

    return {
      annotation,
      anchorLabel: baselineAttachment.originalFilename,
      comparisonStatus: changed ? 'CHANGED' : 'UNCHANGED',
      changes: [
        {
          key: 'attachments',
          changed,
          before: beforeCollection.value,
          after: afterCollection.value,
        },
      ],
    };
  }

  private createNotComparableAnnotationAudit(
    annotation: CommissionReviewCandidateAnnotation,
    anchorLabel: string | null,
  ): CommissionReviewResolvedAnnotationAudit {
    return {
      annotation,
      anchorLabel,
      comparisonStatus: 'NOT_COMPARABLE',
      changes: [],
    };
  }

  private createScalarChange(
    key: string,
    beforeValue: string | null,
    afterValue: string | null,
  ): CommissionReviewResolvedAnnotationChange {
    const valueKind = DATE_FIELDS.has(key as EditableInstructorApplicationField)
      ? 'DATE'
      : ENUM_FIELDS.has(key)
        ? 'ENUM'
        : 'TEXT';

    return {
      key,
      changed: beforeValue !== afterValue,
      before: this.toScalarValue(valueKind, beforeValue),
      after: this.toScalarValue(valueKind, afterValue),
    };
  }

  private toScalarValue(
    kind: 'TEXT' | 'DATE' | 'ENUM',
    value: string | null,
  ): CommissionReviewResolvedChangeValue {
    if (kind === 'TEXT') {
      return {
        kind,
        text: value,
      };
    }

    if (kind === 'DATE') {
      return {
        kind,
        date: value,
      };
    }

    return {
      kind,
      value,
    };
  }

  private toAttachmentSetValue(
    attachments: NormalizedAttachmentSnapshot[],
  ): CommissionReviewResolvedChangeValue {
    return {
      kind: 'ATTACHMENT_SET',
      items: [...attachments]
        .sort((left, right) =>
          left.originalFilename.localeCompare(right.originalFilename),
        )
        .map((attachment) => ({
          uuid: attachment.uuid,
          originalFilename: attachment.originalFilename,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
        })),
    };
  }

  private createAttachmentSetSignature(
    attachments: NormalizedAttachmentSnapshot[],
  ): string {
    return [...attachments]
      .map((attachment) =>
        [
          attachment.checksum ?? '',
          attachment.objectKey ?? '',
          attachment.originalFilename,
          attachment.contentType,
          String(attachment.sizeBytes),
        ].join('|'),
      )
      .sort()
      .join('||');
  }

  private resolveAttachmentOwner(
    attachment: NormalizedAttachmentSnapshot,
  ): AttachmentOwner | null {
    if (
      !attachment.hasRequirementUuidKey ||
      !attachment.hasHufcowyPresenceKey
    ) {
      return null;
    }

    if (attachment.isHufcowyPresence) {
      return { kind: 'HUFCOWY_PRESENCE' };
    }

    if (attachment.requirementUuid) {
      return {
        kind: 'REQUIREMENT',
        requirementUuid: attachment.requirementUuid,
      };
    }

    return { kind: 'GENERAL_ATTACHMENTS' };
  }

  private getAttachmentCollectionForOwner(
    snapshot: NormalizedSnapshot,
    owner: AttachmentOwner,
  ): {
    value: CommissionReviewResolvedChangeValue;
    signature: string;
  } {
    return (
      snapshot.attachmentCollectionsByOwner.get(
        this.toAttachmentOwnerKey(owner),
      ) ?? {
        value: this.toAttachmentSetValue([]),
        signature: this.createAttachmentSetSignature([]),
      }
    );
  }

  private toAttachmentOwnerKey(owner: AttachmentOwner): string {
    if (owner.kind === 'REQUIREMENT') {
      return `REQUIREMENT:${owner.requirementUuid}`;
    }

    return owner.kind;
  }

  private formatRequirementLabel(
    baselineRequirement: NormalizedRequirementSnapshot,
    responseRequirement: NormalizedRequirementSnapshot,
  ): string | null {
    const code = baselineRequirement.code ?? responseRequirement.code;
    const description =
      baselineRequirement.description ?? responseRequirement.description;

    if (!code && !description) {
      return null;
    }

    if (code && description) {
      return `${code}. ${description}`;
    }

    return code ?? description ?? null;
  }

  private normalizeSnapshot(snapshot: SnapshotInput): NormalizedSnapshot {
    const applicationData = this.readRecord(snapshot.applicationDataSnapshot);
    const applicationFields = new Map<
      EditableInstructorApplicationField,
      string | null
    >();
    for (const fieldKey of SNAPSHOT_FIELD_KEYS) {
      if (!this.hasOwn(applicationData, fieldKey)) {
        continue;
      }

      applicationFields.set(
        fieldKey,
        this.readSnapshotScalar(applicationData[fieldKey]),
      );
    }
    const requirements = this.readArray(snapshot.requirementsSnapshot)
      .map((entry) => this.normalizeRequirement(entry))
      .filter(
        (entry): entry is NormalizedRequirementSnapshot => entry !== null,
      );
    const attachments = this.readArray(snapshot.attachmentsMetadata)
      .map((entry) => this.normalizeAttachment(entry))
      .filter((entry): entry is NormalizedAttachmentSnapshot => entry !== null);

    return {
      revision: snapshot.revision,
      applicationFields,
      requirementsByUuid: new Map(
        requirements.map((requirement) => [requirement.uuid, requirement]),
      ),
      attachments,
      attachmentsByUuid: new Map(
        attachments.map((attachment) => [attachment.uuid, attachment]),
      ),
      attachmentCollectionsByOwner:
        this.buildAttachmentCollectionsByOwner(attachments),
    };
  }

  private buildAttachmentCollectionsByOwner(
    attachments: NormalizedAttachmentSnapshot[],
  ): Map<
    string,
    {
      value: CommissionReviewResolvedChangeValue;
      signature: string;
    }
  > {
    const attachmentsByOwner = new Map<
      string,
      NormalizedAttachmentSnapshot[]
    >();

    for (const attachment of attachments) {
      const owner = this.resolveAttachmentOwner(attachment);

      if (!owner) {
        continue;
      }

      const ownerKey = this.toAttachmentOwnerKey(owner);
      const existing = attachmentsByOwner.get(ownerKey);

      if (existing) {
        existing.push(attachment);
        continue;
      }

      attachmentsByOwner.set(ownerKey, [attachment]);
    }

    return new Map(
      [...attachmentsByOwner.entries()].map(([ownerKey, ownerAttachments]) => [
        ownerKey,
        {
          value: this.toAttachmentSetValue(ownerAttachments),
          signature: this.createAttachmentSetSignature(ownerAttachments),
        },
      ]),
    );
  }

  private normalizeRequirement(
    value: Prisma.JsonValue,
  ): NormalizedRequirementSnapshot | null {
    const record = this.readRecord(value);
    const uuid = this.readString(record.uuid);

    if (!uuid) {
      return null;
    }

    return {
      uuid,
      code: this.readString(record.code),
      description: this.readString(record.description),
      state: this.readSnapshotScalar(record.state),
      actionDescription: this.readSnapshotScalar(record.actionDescription),
      verificationText: this.readSnapshotScalar(record.verificationText),
      availableKeys: new Set(Object.keys(record)),
    };
  }

  private normalizeAttachment(
    value: Prisma.JsonValue,
  ): NormalizedAttachmentSnapshot | null {
    const record = this.readRecord(value);
    const uuid = this.readString(record.uuid);
    const originalFilename = this.readString(record.originalFilename);
    const contentType = this.readString(record.contentType);
    const sizeBytes = this.readNumber(record.sizeBytes);

    if (!uuid || !originalFilename || !contentType || sizeBytes === null) {
      return null;
    }

    return {
      uuid,
      objectKey: this.readString(record.objectKey),
      originalFilename,
      contentType,
      sizeBytes,
      checksum: this.readString(record.checksum),
      requirementUuid: this.readString(record.instructorRequirementUuid),
      isHufcowyPresence: this.readBoolean(record.isHufcowyPresence) ?? false,
      hasRequirementUuidKey: this.hasOwn(record, 'instructorRequirementUuid'),
      hasHufcowyPresenceKey: this.hasOwn(record, 'isHufcowyPresence'),
    };
  }

  private hasRequiredRequirementFields(
    requirement: NormalizedRequirementSnapshot,
  ): boolean {
    return ['state', 'actionDescription', 'verificationText'].every((key) =>
      requirement.availableKeys.has(key),
    );
  }

  private readSnapshotScalar(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return null;
  }

  private readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private readArray(value: unknown): Prisma.JsonValue[] {
    return Array.isArray(value) ? (value as Prisma.JsonValue[]) : [];
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private readBoolean(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
  }

  private hasOwn(record: Record<string, unknown>, key: string): boolean {
    return Object.hasOwn(record, key);
  }
}
