// @file: apps/web/src/components/instructor-application/revision/candidate-fix-targets.ts
import {
  INSTRUCTOR_REVIEW_SECTION_EDITABLE_FIELDS,
  type EditableInstructorApplicationField,
  type InstructorApplicationDetail,
  type InstructorReviewCandidateAnnotationPublic,
} from "@hss/schemas";
import { getFieldLabel } from "@/lib/instructor-application-fields";

export const CANDIDATE_FIX_STEPS = [
  "basicInfo",
  "serviceHistory",
  "supervisor",
  "requirements",
  "summary",
] as const;

export type CandidateFixStepId = (typeof CANDIDATE_FIX_STEPS)[number];

type TranslateFn = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export type CandidateFixTarget = {
  annotationUuid: string;
  stepIndex: number;
  stepId: CandidateFixStepId;
  targetId: string | null;
  progressId: string | null;
  label: string;
  context?: string;
  body: string;
  preview: string;
  isGeneral: boolean;
  annotation: InstructorReviewCandidateAnnotationPublic;
};

const BASIC_INFO_FIELDS = new Set<EditableInstructorApplicationField>(
  INSTRUCTOR_REVIEW_SECTION_EDITABLE_FIELDS.BASIC_INFO,
);

const SERVICE_HISTORY_FIELDS = new Set<EditableInstructorApplicationField>(
  INSTRUCTOR_REVIEW_SECTION_EDITABLE_FIELDS.SERVICE_HISTORY,
);

const SUPERVISOR_FIELDS = new Set<EditableInstructorApplicationField>(
  INSTRUCTOR_REVIEW_SECTION_EDITABLE_FIELDS.SUPERVISOR,
);

function buildPreview(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
}

function resolveCandidateAnnotationMeta(
  annotation: InstructorReviewCandidateAnnotationPublic,
  app: InstructorApplicationDetail,
  t: TranslateFn,
): { label: string; context?: string } {
  if (annotation.anchorType === "APPLICATION") {
    return { label: t("candidateEditScope.anchors.application") };
  }

  if (annotation.anchorType === "SECTION") {
    return { label: t(`candidateEditScope.anchors.sections.${annotation.anchorKey}`) };
  }

  if (annotation.anchorType === "FIELD") {
    return { label: getFieldLabel(annotation.anchorKey, t, app.requirements) };
  }

  if (annotation.anchorType === "REQUIREMENT") {
    const requirement = app.requirements.find(
      (candidateRequirement) => candidateRequirement.uuid === annotation.anchorKey,
    );

    return requirement
      ? {
          label: requirement.definition.code,
          context: requirement.definition.description,
        }
      : { label: t("candidateEditScope.anchors.unknownRequirement") };
  }

  const topLevelAttachment = app.attachments.find(
    (attachment) => attachment.uuid === annotation.anchorKey,
  );
  if (topLevelAttachment) {
    return { label: topLevelAttachment.originalFilename };
  }

  const requirementAttachment = app.requirements
    .flatMap((requirement) => requirement.attachments ?? [])
    .find((attachment) => attachment.uuid === annotation.anchorKey);

  return {
    label:
      requirementAttachment?.originalFilename
      ?? t("candidateEditScope.anchors.unknownAttachment"),
  };
}

function resolveStepIndex(
  annotation: InstructorReviewCandidateAnnotationPublic,
): number {
  if (annotation.anchorType === "APPLICATION") {
    return 4;
  }

  if (annotation.anchorType === "SECTION") {
    if (annotation.anchorKey === "BASIC_INFO") {
      return 0;
    }

    if (annotation.anchorKey === "SERVICE_HISTORY") {
      return 1;
    }

    if (annotation.anchorKey === "SUPERVISOR") {
      return 2;
    }

    return 4;
  }

  if (annotation.anchorType === "FIELD") {
    if (BASIC_INFO_FIELDS.has(annotation.anchorKey as EditableInstructorApplicationField)) {
      return 0;
    }

    if (
      SERVICE_HISTORY_FIELDS.has(
        annotation.anchorKey as EditableInstructorApplicationField,
      )
    ) {
      return 1;
    }

    if (
      SUPERVISOR_FIELDS.has(annotation.anchorKey as EditableInstructorApplicationField)
    ) {
      return 2;
    }

    return 4;
  }

  if (annotation.anchorType === "REQUIREMENT") {
    return 3;
  }

  return 4;
}

function resolveTargetId(
  annotation: InstructorReviewCandidateAnnotationPublic,
): string | null {
  if (annotation.anchorType === "APPLICATION") {
    return "general-annotations";
  }

  if (annotation.anchorType === "SECTION") {
    return `section:${annotation.anchorKey}`;
  }

  if (annotation.anchorType === "FIELD") {
    return `field:${annotation.anchorKey}`;
  }

  if (annotation.anchorType === "REQUIREMENT") {
    return `requirement:${annotation.anchorKey}`;
  }

  if (annotation.anchorType === "ATTACHMENT") {
    return `attachment:${annotation.anchorKey}`;
  }

  return null;
}

function findRequirementAttachmentOwner(
  app: InstructorApplicationDetail,
  attachmentUuid: string,
) {
  for (const requirement of app.requirements) {
    const attachment = requirement.attachments?.find(
      (candidateAttachment) => candidateAttachment.uuid === attachmentUuid,
    );

    if (attachment) {
      return { requirement, attachment };
    }
  }

  return null;
}

function joinContext(...parts: Array<string | null | undefined>): string | undefined {
  const filtered = parts
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);

  if (filtered.length === 0) {
    return undefined;
  }

  return filtered.join(" • ");
}

function resolveAttachmentTarget(
  attachmentUuid: string,
  app: InstructorApplicationDetail,
  initialApp: InstructorApplicationDetail,
  t: TranslateFn,
): {
  stepIndex: number;
  targetId: string;
  label: string;
  context?: string;
} {
  const currentRequirementOwner = findRequirementAttachmentOwner(app, attachmentUuid);
  const initialRequirementOwner = findRequirementAttachmentOwner(
    initialApp,
    attachmentUuid,
  );
  const requirementOwner = currentRequirementOwner ?? initialRequirementOwner;

  if (requirementOwner) {
    return {
      stepIndex: 3,
      targetId: `requirement:${requirementOwner.requirement.uuid}`,
      label: `${t("candidateEditScope.requirementAttachmentsLabel")} - ${requirementOwner.requirement.definition.code}`,
      context: joinContext(
        requirementOwner.requirement.definition.description,
        requirementOwner.attachment.originalFilename,
      ),
    };
  }

  const topLevelAttachment =
    app.attachments.find((attachment) => attachment.uuid === attachmentUuid)
    ?? initialApp.attachments.find((attachment) => attachment.uuid === attachmentUuid)
    ?? null;
  const isHufcowyPresenceAttachment =
    attachmentUuid === app.hufcowyPresenceAttachmentUuid
    || attachmentUuid === initialApp.hufcowyPresenceAttachmentUuid;

  if (isHufcowyPresenceAttachment) {
    return {
      stepIndex: 0,
      targetId: "field:hufcowyPresence",
      label: t("fields.hufcowyPresenceAttachment"),
      context: topLevelAttachment?.originalFilename,
    };
  }

  return {
    stepIndex: 4,
    targetId: "section:GENERAL_ATTACHMENTS",
    label:
      topLevelAttachment?.originalFilename
      ?? t("candidateEditScope.anchors.sections.GENERAL_ATTACHMENTS"),
    context: topLevelAttachment
      ? t("candidateEditScope.anchors.sections.GENERAL_ATTACHMENTS")
      : undefined,
  };
}

export function buildCandidateFixTargets(
  app: InstructorApplicationDetail,
  initialApp: InstructorApplicationDetail,
  t: TranslateFn,
): CandidateFixTarget[] {
  return app.candidateEditScope.annotations.map((annotation) => {
    if (annotation.anchorType === "ATTACHMENT") {
      const attachmentTarget = resolveAttachmentTarget(
        annotation.anchorKey,
        app,
        initialApp,
        t,
      );

      return {
        annotationUuid: annotation.uuid,
        stepIndex: attachmentTarget.stepIndex,
        stepId: CANDIDATE_FIX_STEPS[attachmentTarget.stepIndex],
        targetId: attachmentTarget.targetId,
        progressId: `attachment:${annotation.anchorKey}`,
        label: attachmentTarget.label,
        context: attachmentTarget.context,
        body: annotation.body,
        preview: buildPreview(annotation.body),
        isGeneral: false,
        annotation,
      };
    }

    const stepIndex = resolveStepIndex(annotation);
    const targetMeta = resolveCandidateAnnotationMeta(annotation, app, t);
    const targetId = resolveTargetId(annotation);

    return {
      annotationUuid: annotation.uuid,
      stepIndex,
      stepId: CANDIDATE_FIX_STEPS[stepIndex],
      targetId,
      progressId: targetId,
      label: targetMeta.label,
      context: targetMeta.context,
      body: annotation.body,
      preview: buildPreview(annotation.body),
      isGeneral: annotation.anchorType === "APPLICATION",
      annotation,
    };
  });
}

export function buildCandidateFixCountsByStep(
  targets: CandidateFixTarget[],
): number[] {
  const counts = CANDIDATE_FIX_STEPS.map(() => 0);

  for (const target of targets) {
    counts[target.stepIndex] += 1;
  }

  return counts;
}

export function countCandidateFixSteps(targets: CandidateFixTarget[]): number {
  return new Set(targets.map((target) => target.stepId)).size;
}
