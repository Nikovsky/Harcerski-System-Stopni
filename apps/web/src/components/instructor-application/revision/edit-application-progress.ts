// @file: apps/web/src/components/instructor-application/revision/edit-application-progress.ts
import { degreeKey, scoutRankKey } from "@/lib/applications-i18n";
import {
  CANDIDATE_FIX_STEPS,
  buildCandidateFixTargets,
  type CandidateFixTarget,
} from "@/components/instructor-application/revision/candidate-fix-targets";
import { type ChangeSummary } from "@/components/instructor-application/ui/ChangeSummary";
import type {
  EditableInstructorApplicationField,
  InstructorApplicationDetail,
  RequirementRowResponse,
} from "@hss/schemas/instructor-application";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number>,
) => string;

type AttachmentLike = Pick<
  InstructorApplicationDetail["attachments"][number],
  "uuid" | "originalFilename"
>;

type RequirementByUuid = Map<string, RequirementRowResponse>;
type RequirementAttachmentOwnerByUuid = Map<string, string>;

type EditApplicationProgressContext = {
  currentApp: InstructorApplicationDetail;
  initialApp: InstructorApplicationDetail;
  currentRequirementByUuid: RequirementByUuid;
  initialRequirementByUuid: RequirementByUuid;
  currentRequirementAttachmentOwnerByUuid: RequirementAttachmentOwnerByUuid;
  initialRequirementAttachmentOwnerByUuid: RequirementAttachmentOwnerByUuid;
  currentGeneralAttachments: AttachmentLike[];
  initialGeneralAttachments: AttachmentLike[];
  currentHufcowyAttachments: AttachmentLike[];
  initialHufcowyAttachments: AttachmentLike[];
  trackedGeneralAttachmentUuids: Set<string>;
};

export type RequirementDraftState = {
  state: string;
  actionDescription: string;
  verificationText: string;
};

type BuildEditApplicationProgressParams = {
  currentApp: InstructorApplicationDetail;
  initialApp: InstructorApplicationDetail;
  requirementDraftsByUuid: Record<string, RequirementDraftState>;
  t: TranslateFn;
};

type EditApplicationProgress = {
  fixTargets: CandidateFixTarget[];
  fixCountsByStep: number[];
  fixChangedCountsByStep: number[];
  fixProgressByTargetId: Record<string, ChangeSummary>;
  fieldChangeByField: Partial<Record<EditableInstructorApplicationField, ChangeSummary>>;
  requirementChangeByUuid: Record<string, ChangeSummary>;
  requirementAttachmentChangeByUuid: Record<string, ChangeSummary>;
  hufcowyPresenceAttachmentChangeSummary: ChangeSummary | undefined;
  pendingFixLabels: string[];
  summaryAttachmentTargets: CandidateFixTarget[];
};

function createZeroedStepCounts(): number[] {
  return CANDIDATE_FIX_STEPS.map(() => 0);
}

function buildEmptyEditApplicationProgress(): EditApplicationProgress {
  return {
    fixTargets: [],
    fixCountsByStep: createZeroedStepCounts(),
    fixChangedCountsByStep: createZeroedStepCounts(),
    fixProgressByTargetId: {},
    fieldChangeByField: {},
    requirementChangeByUuid: {},
    requirementAttachmentChangeByUuid: {},
    hufcowyPresenceAttachmentChangeSummary: undefined,
    pendingFixLabels: [],
    summaryAttachmentTargets: [],
  };
}

function normalizeComparableValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function displayValueOrDash(value: string | null | undefined): string {
  const normalized = normalizeComparableValue(value);
  return normalized.length > 0 ? normalized : "—";
}

function describeAttachmentSet(attachments: readonly AttachmentLike[]): string {
  if (attachments.length === 0) {
    return "—";
  }

  return attachments.map((attachment) => attachment.originalFilename).join(", ");
}

function buildAttachmentSetChangeSummary(
  initialAttachments: readonly AttachmentLike[],
  currentAttachments: readonly AttachmentLike[],
): ChangeSummary {
  const initialKey = initialAttachments
    .map((attachment) => attachment.uuid)
    .sort()
    .join("|");
  const currentKey = currentAttachments
    .map((attachment) => attachment.uuid)
    .sort()
    .join("|");

  return {
    isChanged: initialKey !== currentKey,
    beforeValue: describeAttachmentSet(initialAttachments),
    afterValue: describeAttachmentSet(currentAttachments),
  };
}

function isActionableCandidateFixTarget(target: CandidateFixTarget): boolean {
  switch (target.annotation.anchorType) {
    case "FIELD":
    case "REQUIREMENT":
    case "ATTACHMENT":
      return true;
    case "SECTION":
      return target.annotation.anchorKey === "GENERAL_ATTACHMENTS";
    default:
      return false;
  }
}

function buildRequirementByUuid(
  requirements: RequirementRowResponse[],
): RequirementByUuid {
  return new Map(
    requirements.map((requirement) => [requirement.uuid, requirement] as const),
  );
}

function buildRequirementAttachmentOwnerByUuid(
  requirements: RequirementRowResponse[],
): RequirementAttachmentOwnerByUuid {
  return new Map(
    requirements.flatMap((requirement) =>
      (requirement.attachments ?? []).map(
        (attachment) => [attachment.uuid, requirement.uuid] as const,
      ),
    ),
  );
}

function buildEditApplicationProgressContext(
  currentApp: InstructorApplicationDetail,
  initialApp: InstructorApplicationDetail,
): EditApplicationProgressContext {
  const currentGeneralAttachments = currentApp.attachments.filter(
    (attachment) => attachment.uuid !== currentApp.hufcowyPresenceAttachmentUuid,
  );
  const initialGeneralAttachments = initialApp.attachments.filter(
    (attachment) => attachment.uuid !== initialApp.hufcowyPresenceAttachmentUuid,
  );
  const currentHufcowyAttachments = currentApp.hufcowyPresenceAttachmentUuid
    ? currentApp.attachments.filter(
        (attachment) => attachment.uuid === currentApp.hufcowyPresenceAttachmentUuid,
      )
    : [];
  const initialHufcowyAttachments = initialApp.hufcowyPresenceAttachmentUuid
    ? initialApp.attachments.filter(
        (attachment) => attachment.uuid === initialApp.hufcowyPresenceAttachmentUuid,
      )
    : [];

  return {
    currentApp,
    initialApp,
    currentRequirementByUuid: buildRequirementByUuid(currentApp.requirements),
    initialRequirementByUuid: buildRequirementByUuid(initialApp.requirements),
    currentRequirementAttachmentOwnerByUuid: buildRequirementAttachmentOwnerByUuid(
      currentApp.requirements,
    ),
    initialRequirementAttachmentOwnerByUuid: buildRequirementAttachmentOwnerByUuid(
      initialApp.requirements,
    ),
    currentGeneralAttachments,
    initialGeneralAttachments,
    currentHufcowyAttachments,
    initialHufcowyAttachments,
    trackedGeneralAttachmentUuids: new Set([
      ...currentGeneralAttachments.map((attachment) => attachment.uuid),
      ...initialGeneralAttachments.map((attachment) => attachment.uuid),
    ]),
  };
}

function formatFieldValue(
  field: EditableInstructorApplicationField,
  app: InstructorApplicationDetail,
  t: TranslateFn,
): string {
  const value = app[field];

  if (typeof value !== "string") {
    return value == null ? "—" : String(value);
  }

  if (field === "openTrialForRank") {
    const translationKey = scoutRankKey(value);
    return translationKey ? t(translationKey) : value;
  }

  if (field === "hufcowyPresence") {
    return value.length > 0 ? t(`presence.${value}`) : "—";
  }

  if (field === "supervisorInstructorRank") {
    const translationKey = degreeKey(value);
    return translationKey ? t(translationKey) : value;
  }

  return displayValueOrDash(value);
}

function formatRequirementDraftValue(
  requirementDraft: RequirementDraftState,
  t: TranslateFn,
): string {
  const parts = [
    requirementDraft.state === "DONE"
      ? t("requirementState.DONE")
      : t("requirementState.PLANNED"),
    normalizeComparableValue(requirementDraft.actionDescription),
    normalizeComparableValue(requirementDraft.verificationText),
  ].filter((value) => value.length > 0);

  return parts.length > 0 ? parts.join(" / ") : "—";
}

function getRequirementDraftState(
  requirement: RequirementRowResponse | undefined,
): RequirementDraftState | null {
  if (!requirement) {
    return null;
  }

  return {
    state: requirement.state,
    actionDescription: requirement.actionDescription,
    verificationText: requirement.verificationText ?? "",
  };
}

export function areRequirementDraftsEqual(
  left: RequirementDraftState | null,
  right: RequirementDraftState | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.state === right.state &&
    normalizeComparableValue(left.actionDescription) ===
      normalizeComparableValue(right.actionDescription) &&
    normalizeComparableValue(left.verificationText) ===
      normalizeComparableValue(right.verificationText)
  );
}

function buildFixProgressByTargetId(
  context: EditApplicationProgressContext,
  fixTargets: CandidateFixTarget[],
  requirementDraftsByUuid: Record<string, RequirementDraftState>,
  t: TranslateFn,
): Record<string, ChangeSummary> {
  const progressByTargetId: Record<string, ChangeSummary> = {};
  const {
    currentApp,
    initialApp,
    currentRequirementByUuid,
    initialRequirementByUuid,
    currentRequirementAttachmentOwnerByUuid,
    initialRequirementAttachmentOwnerByUuid,
    currentGeneralAttachments,
    initialGeneralAttachments,
    currentHufcowyAttachments,
    initialHufcowyAttachments,
  } = context;

  for (const target of fixTargets) {
    const progressId = target.progressId ?? target.targetId;

    if (!progressId) {
      continue;
    }

    if (target.annotation.anchorType === "FIELD") {
      const field = target.annotation.anchorKey as EditableInstructorApplicationField;
      const beforeValue = formatFieldValue(field, initialApp, t);
      const afterValue = formatFieldValue(field, currentApp, t);
      const beforeRawValue = normalizeComparableValue(
        initialApp[field] as string | null | undefined,
      );
      const afterRawValue = normalizeComparableValue(
        currentApp[field] as string | null | undefined,
      );

      progressByTargetId[progressId] = {
        isChanged: beforeRawValue !== afterRawValue,
        beforeValue,
        afterValue,
      };
      continue;
    }

    if (target.annotation.anchorType === "SECTION") {
      progressByTargetId[progressId] =
        target.annotation.anchorKey === "GENERAL_ATTACHMENTS"
          ? buildAttachmentSetChangeSummary(
              initialGeneralAttachments,
              currentGeneralAttachments,
            )
          : { isChanged: false };
      continue;
    }

    if (target.annotation.anchorType === "REQUIREMENT") {
      const requirementUuid = target.annotation.anchorKey;
      const baselineRequirementDraft = getRequirementDraftState(
        initialRequirementByUuid.get(requirementUuid),
      );
      const liveRequirementDraft =
        requirementDraftsByUuid[requirementUuid] ??
        getRequirementDraftState(currentRequirementByUuid.get(requirementUuid));

      progressByTargetId[progressId] = {
        isChanged: !areRequirementDraftsEqual(
          baselineRequirementDraft,
          liveRequirementDraft,
        ),
        beforeValue: baselineRequirementDraft
          ? formatRequirementDraftValue(baselineRequirementDraft, t)
          : undefined,
        afterValue: liveRequirementDraft
          ? formatRequirementDraftValue(liveRequirementDraft, t)
          : undefined,
      };
      continue;
    }

    if (target.annotation.anchorType !== "ATTACHMENT") {
      continue;
    }

    const attachmentUuid = target.annotation.anchorKey;
    const requirementUuid =
      currentRequirementAttachmentOwnerByUuid.get(attachmentUuid) ??
      initialRequirementAttachmentOwnerByUuid.get(attachmentUuid) ??
      null;

    if (requirementUuid) {
      progressByTargetId[progressId] = buildAttachmentSetChangeSummary(
        initialRequirementByUuid.get(requirementUuid)?.attachments ?? [],
        currentRequirementByUuid.get(requirementUuid)?.attachments ?? [],
      );
      continue;
    }

    if (
      attachmentUuid === currentApp.hufcowyPresenceAttachmentUuid ||
      attachmentUuid === initialApp.hufcowyPresenceAttachmentUuid
    ) {
      progressByTargetId[progressId] = buildAttachmentSetChangeSummary(
        initialHufcowyAttachments,
        currentHufcowyAttachments,
      );
      continue;
    }

    progressByTargetId[progressId] = buildAttachmentSetChangeSummary(
      initialGeneralAttachments,
      currentGeneralAttachments,
    );
  }

  const hasAnyChanged = Object.entries(progressByTargetId).some(
    ([targetId, progress]) =>
      targetId !== "general-annotations" && progress.isChanged,
  );

  for (const target of fixTargets) {
    if (
      target.annotation.anchorType === "SECTION" &&
      target.annotation.anchorKey !== "GENERAL_ATTACHMENTS" &&
      target.targetId
    ) {
      progressByTargetId[target.targetId] = {
        isChanged: fixTargets.some((candidateTarget) => {
          if (
            candidateTarget.annotation.anchorType === "SECTION" ||
            candidateTarget.annotation.anchorType === "APPLICATION" ||
            candidateTarget.stepIndex !== target.stepIndex
          ) {
            return false;
          }

          const candidateProgressId =
            candidateTarget.progressId ?? candidateTarget.targetId;

          return !!candidateProgressId && progressByTargetId[candidateProgressId]?.isChanged === true;
        }),
      };
      continue;
    }

    if (target.annotation.anchorType !== "APPLICATION" || !target.targetId) {
      continue;
    }

    progressByTargetId[target.targetId] = {
      isChanged: hasAnyChanged,
    };
  }

  return progressByTargetId;
}

export function buildEditApplicationProgress({
  currentApp,
  initialApp,
  requirementDraftsByUuid,
  t,
}: BuildEditApplicationProgressParams): EditApplicationProgress {
  if (currentApp.status !== "TO_FIX") {
    return buildEmptyEditApplicationProgress();
  }

  const context = buildEditApplicationProgressContext(currentApp, initialApp);
  const fixTargets = buildCandidateFixTargets(currentApp, initialApp, t);
  const actionableFixTargets: CandidateFixTarget[] = [];
  const fixCountsByStep = createZeroedStepCounts();
  const requirementAttachmentTargetUuids = new Set<string>();
  const summaryAttachmentTargets: CandidateFixTarget[] = [];
  let hasHufcowyPresenceAttachmentFix = false;

  for (const target of fixTargets) {
    if (isActionableCandidateFixTarget(target)) {
      actionableFixTargets.push(target);
      fixCountsByStep[target.stepIndex] += 1;
    }

    if (target.annotation.anchorType === "ATTACHMENT") {
      const attachmentUuid = target.annotation.anchorKey;
      const requirementUuid =
        context.currentRequirementAttachmentOwnerByUuid.get(attachmentUuid) ??
        context.initialRequirementAttachmentOwnerByUuid.get(attachmentUuid) ??
        null;

      if (requirementUuid) {
        requirementAttachmentTargetUuids.add(requirementUuid);
      } else if (
        attachmentUuid === currentApp.hufcowyPresenceAttachmentUuid ||
        attachmentUuid === initialApp.hufcowyPresenceAttachmentUuid
      ) {
        hasHufcowyPresenceAttachmentFix = true;
      }

      if (context.trackedGeneralAttachmentUuids.has(attachmentUuid)) {
        summaryAttachmentTargets.push(target);
      }
      continue;
    }

    if (
      target.annotation.anchorType === "SECTION" &&
      target.annotation.anchorKey === "GENERAL_ATTACHMENTS"
    ) {
      summaryAttachmentTargets.push(target);
    }
  }

  const fixProgressByTargetId = buildFixProgressByTargetId(
    context,
    fixTargets,
    requirementDraftsByUuid,
    t,
  );
  const fixChangedCountsByStep = createZeroedStepCounts();
  const pendingFixLabelSet = new Set<string>();

  for (const target of actionableFixTargets) {
    const progressId = target.progressId ?? target.targetId;

    if (!progressId) {
      continue;
    }

    const isChanged = fixProgressByTargetId[progressId]?.isChanged === true;

    if (!target.isGeneral && isChanged) {
      fixChangedCountsByStep[target.stepIndex] += 1;
    }

    if (!isChanged) {
      pendingFixLabelSet.add(
        target.context ? `${target.label}. ${target.context}` : target.label,
      );
    }
  }

  const fieldChangeByField: Partial<
    Record<EditableInstructorApplicationField, ChangeSummary>
  > = {};
  const requirementChangeByUuid: Record<string, ChangeSummary> = {};

  for (const target of fixTargets) {
    const progressId = target.progressId ?? target.targetId;

    if (!progressId) {
      continue;
    }

    const progress = fixProgressByTargetId[progressId];

    if (!progress) {
      continue;
    }

    if (target.annotation.anchorType === "FIELD") {
      fieldChangeByField[target.annotation.anchorKey as EditableInstructorApplicationField] =
        progress;
      continue;
    }

    if (target.annotation.anchorType === "REQUIREMENT") {
      requirementChangeByUuid[target.annotation.anchorKey] = progress;
    }
  }

  const requirementAttachmentChangeByUuid: Record<string, ChangeSummary> = {};

  for (const requirementUuid of requirementAttachmentTargetUuids) {
    requirementAttachmentChangeByUuid[requirementUuid] =
      buildAttachmentSetChangeSummary(
        context.initialRequirementByUuid.get(requirementUuid)?.attachments ?? [],
        context.currentRequirementByUuid.get(requirementUuid)?.attachments ?? [],
      );
  }

  return {
    fixTargets,
    fixCountsByStep,
    fixChangedCountsByStep,
    fixProgressByTargetId,
    fieldChangeByField,
    requirementChangeByUuid,
    requirementAttachmentChangeByUuid,
    hufcowyPresenceAttachmentChangeSummary: hasHufcowyPresenceAttachmentFix
      ? buildAttachmentSetChangeSummary(
          context.initialHufcowyAttachments,
          context.currentHufcowyAttachments,
        )
      : undefined,
    pendingFixLabels: Array.from(pendingFixLabelSet),
    summaryAttachmentTargets,
  };
}
