// @file: apps/web/src/components/commission-review/commission-review-anchor-model.ts
import { getFieldLabel } from "@/lib/instructor-application-fields";
import type {
  CommissionReviewApplicationDetail,
  CommissionReviewCandidateAnnotation,
  EditableInstructorApplicationField,
  InstructorReviewAnchorType,
} from "@hss/schemas";

export type CommissionAnchorCountEntry = {
  anchorType: InstructorReviewAnchorType;
  anchorKey: string;
  count: number;
};

export type CommissionAnchorInteractionMeta = Record<
  string,
  {
    candidateCount: number;
    internalCount: number;
    hasCandidateDraft: boolean;
  }
>;

export type CommissionAnchorLabelReference = Pick<
  CommissionReviewCandidateAnnotation,
  "anchorType" | "anchorKey"
> & { label?: string | undefined };

export function anchorIdentity(
  anchorType: InstructorReviewAnchorType,
  anchorKey: string,
): string {
  return `${anchorType}:${anchorKey}`;
}

export function buildAnchorCountEntries(
  entries: Array<{
    anchorType: InstructorReviewAnchorType;
    anchorKey: string;
  }>,
): CommissionAnchorCountEntry[] {
  const counts = new Map<string, CommissionAnchorCountEntry>();

  for (const entry of entries) {
    const key = anchorIdentity(entry.anchorType, entry.anchorKey);
    const current = counts.get(key);

    if (current) {
      current.count += 1;
      continue;
    }

    counts.set(key, {
      anchorType: entry.anchorType,
      anchorKey: entry.anchorKey,
      count: 1,
    });
  }

  return [...counts.values()];
}

export function buildAnchorInteractionMeta({
  candidateAnnotationCounts,
  internalNoteCounts,
  draftAnnotations,
}: {
  candidateAnnotationCounts: CommissionAnchorCountEntry[];
  internalNoteCounts: CommissionAnchorCountEntry[];
  draftAnnotations: CommissionReviewCandidateAnnotation[];
}): CommissionAnchorInteractionMeta {
  const meta: CommissionAnchorInteractionMeta = {};

  for (const entry of candidateAnnotationCounts) {
    const key = anchorIdentity(entry.anchorType, entry.anchorKey);
    meta[key] = {
      candidateCount: entry.count,
      internalCount: meta[key]?.internalCount ?? 0,
      hasCandidateDraft: meta[key]?.hasCandidateDraft ?? false,
    };
  }

  for (const entry of internalNoteCounts) {
    const key = anchorIdentity(entry.anchorType, entry.anchorKey);
    meta[key] = {
      candidateCount: meta[key]?.candidateCount ?? 0,
      internalCount: entry.count,
      hasCandidateDraft: meta[key]?.hasCandidateDraft ?? false,
    };
  }

  for (const annotation of draftAnnotations) {
    const key = anchorIdentity(annotation.anchorType, annotation.anchorKey);
    meta[key] = {
      candidateCount: meta[key]?.candidateCount ?? 0,
      internalCount: meta[key]?.internalCount ?? 0,
      hasCandidateDraft: true,
    };
  }

  return meta;
}

export function buildAnchorLabels({
  applicationUuid,
  detail,
  tCommission,
  tApplications,
  applicationFields,
  supervisorFields,
  serviceHistoryFields,
}: {
  applicationUuid: string;
  detail: CommissionReviewApplicationDetail;
  tCommission: (key: string, values?: Record<string, string | number>) => string;
  tApplications: (key: string, values?: Record<string, string | number>) => string;
  applicationFields: readonly EditableInstructorApplicationField[];
  supervisorFields: readonly EditableInstructorApplicationField[];
  serviceHistoryFields: readonly EditableInstructorApplicationField[];
}): Record<string, string> {
  const application = detail.application;
  const labels: Record<string, string> = {
    [anchorIdentity("APPLICATION", applicationUuid)]: tCommission(
      "anchors.application",
    ),
    [anchorIdentity("SECTION", "BASIC_INFO")]: tCommission(
      "anchors.sections.BASIC_INFO",
    ),
    [anchorIdentity("SECTION", "SUPERVISOR")]: tCommission(
      "anchors.sections.SUPERVISOR",
    ),
    [anchorIdentity("SECTION", "SERVICE_HISTORY")]: tCommission(
      "anchors.sections.SERVICE_HISTORY",
    ),
    [anchorIdentity("SECTION", "GENERAL_ATTACHMENTS")]: tCommission(
      "anchors.sections.GENERAL_ATTACHMENTS",
    ),
  };

  for (const field of [
    ...applicationFields,
    ...supervisorFields,
    ...serviceHistoryFields,
  ]) {
    labels[anchorIdentity("FIELD", field)] = getFieldLabel(
      field,
      tApplications,
      application.requirements,
    );
  }

  for (const requirement of application.requirements) {
    if (requirement.definition.isGroup) {
      continue;
    }

    labels[anchorIdentity("REQUIREMENT", requirement.uuid)] =
      `${requirement.definition.code}. ${requirement.definition.description}`;

    for (const attachment of requirement.attachments ?? []) {
      labels[anchorIdentity("ATTACHMENT", attachment.uuid)] =
        attachment.originalFilename;
    }
  }

  for (const attachment of application.attachments) {
    labels[anchorIdentity("ATTACHMENT", attachment.uuid)] =
      attachment.originalFilename;
  }

  return labels;
}
